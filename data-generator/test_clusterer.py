"""Tests for clusterer.py — Phase 4: cluster assignment, topo sort, fact sharding."""

from __future__ import annotations

import warnings

import pytest

from clusterer import (
    Cluster,
    _build_cluster_dependency_graph,
    _build_cross_ref_graph,
    _detect_and_merge_cycles,
    _find_connected_components,
    _get_cluster_hint,
    _get_cross_references,
    _get_file_id,
    _group_by_cluster_hint,
    _split_group,
    _topological_sort_with_levels,
    _try_merge_singletons,
    assign_clusters,
    shard_fact_registry,
)

# ---------------------------------------------------------------------------
# Fixtures: sample data
# ---------------------------------------------------------------------------

def _make_entry(file_id: str, cluster_hint: str = "misc", cross_refs: list[str] | None = None) -> dict:
    """Helper to make a minimal manifest entry."""
    entry = {"file_id": file_id, "cluster_hint": cluster_hint}
    if cross_refs:
        entry["cross_references"] = cross_refs
    return entry


def _sample_fact_registry() -> dict:
    """A realistic fact registry for testing sharding."""
    return {
        "scenario_id": "dp_001",
        "people": [
            {"id": "john_doe", "full_name": "John Doe", "role": "CEO"},
            {"id": "jane_smith", "full_name": "Jane Smith", "role": "CTO"},
        ],
        "organizations": [
            {"id": "acme_corp", "name": "Acme Corp", "type": "company"},
        ],
        "dates": [
            {"id": "date_kickoff", "date": "2024-01-15", "event": "Project kickoff", "files": ["f001", "f002"]},
            {"id": "date_launch", "date": "2024-06-01", "event": "Product launch", "files": ["f005", "f006"]},
        ],
        "financial": [
            {"id": "budget_q1", "value": "$50,000.00", "description": "Q1 budget", "files": ["f001", "f003"]},
            {"id": "budget_q2", "value": "$75,000.00", "description": "Q2 budget", "files": ["f004"]},
        ],
        "references": [
            {"id": "ref_contract", "value": "CTR-2024-001", "type": "contract", "files": ["f001", "f002"]},
        ],
        "locations": [
            {"id": "hq_office", "name": "HQ", "address": "123 Main St", "files": ["f001"]},
            {"id": "branch_office", "name": "Branch", "address": "456 Oak Ave", "files": ["f005"]},
        ],
        "domain_facts": [
            {"id": "tech_stack", "category": "technical", "fact": "Uses Python 3.12", "files": ["f003", "f004"]},
        ],
        "cross_references": [
            {"source_file": "f001", "target_file": "f002", "fact_ids": ["date_kickoff"], "description": "kickoff ref"},
            {"source_file": "f005", "target_file": "f006", "fact_ids": ["date_launch"], "description": "launch ref"},
        ],
    }


# ---------------------------------------------------------------------------
# Tests: shard_fact_registry
# ---------------------------------------------------------------------------


class TestShardFactRegistry:
    def test_global_categories_always_included(self):
        registry = _sample_fact_registry()
        shard = shard_fact_registry(registry, ["f001"])
        assert shard["people"] == registry["people"]
        assert shard["organizations"] == registry["organizations"]

    def test_scalar_fields_copied(self):
        registry = _sample_fact_registry()
        shard = shard_fact_registry(registry, ["f001"])
        assert shard["scenario_id"] == "dp_001"

    def test_scoped_dates_filtered(self):
        registry = _sample_fact_registry()
        shard = shard_fact_registry(registry, ["f001"])
        # f001 is in date_kickoff but not date_launch
        assert len(shard["dates"]) == 1
        assert shard["dates"][0]["id"] == "date_kickoff"

    def test_scoped_financial_filtered(self):
        registry = _sample_fact_registry()
        shard = shard_fact_registry(registry, ["f004"])
        assert len(shard["financial"]) == 1
        assert shard["financial"][0]["id"] == "budget_q2"

    def test_scoped_locations_filtered(self):
        registry = _sample_fact_registry()
        shard = shard_fact_registry(registry, ["f005"])
        assert len(shard["locations"]) == 1
        assert shard["locations"][0]["id"] == "branch_office"

    def test_cross_references_filtered(self):
        registry = _sample_fact_registry()
        shard = shard_fact_registry(registry, ["f001"])
        assert len(shard["cross_references"]) == 1
        assert shard["cross_references"][0]["source_file"] == "f001"

    def test_multiple_file_ids(self):
        registry = _sample_fact_registry()
        shard = shard_fact_registry(registry, ["f001", "f005", "f006"])
        # dates: date_kickoff (f001,f002) and date_launch (f005,f006)
        assert len(shard["dates"]) == 2
        # cross_references: both entries touch our files
        assert len(shard["cross_references"]) == 2

    def test_no_matching_files_returns_empty_scoped(self):
        registry = _sample_fact_registry()
        shard = shard_fact_registry(registry, ["f999"])
        assert shard["dates"] == []
        assert shard["financial"] == []
        assert shard["cross_references"] == []
        # Globals still present
        assert len(shard["people"]) == 2

    def test_empty_registry(self):
        shard = shard_fact_registry({}, ["f001"])
        assert shard == {}

    def test_missing_files_key_in_entry(self):
        registry = {
            "dates": [{"id": "d1", "date": "2024-01-01"}],  # no 'files' key
        }
        shard = shard_fact_registry(registry, ["f001"])
        assert shard["dates"] == []


# ---------------------------------------------------------------------------
# Tests: helper functions
# ---------------------------------------------------------------------------


class TestHelpers:
    def test_get_file_id(self):
        assert _get_file_id({"file_id": "f001"}) == "f001"
        assert _get_file_id({}) == ""

    def test_get_cluster_hint_present(self):
        assert _get_cluster_hint({"cluster_hint": "engineering"}) == "engineering"

    def test_get_cluster_hint_missing(self):
        assert _get_cluster_hint({}) == "misc"

    def test_get_cluster_hint_empty_string(self):
        assert _get_cluster_hint({"cluster_hint": ""}) == "misc"

    def test_get_cluster_hint_none(self):
        assert _get_cluster_hint({"cluster_hint": None}) == "misc"

    def test_get_cross_references(self):
        assert _get_cross_references({"cross_references": ["f002", "f003"]}) == ["f002", "f003"]
        assert _get_cross_references({}) == []
        assert _get_cross_references({"cross_references": "not_a_list"}) == []


class TestGroupByClusterHint:
    def test_basic_grouping(self):
        manifest = [
            _make_entry("f001", "eng"),
            _make_entry("f002", "eng"),
            _make_entry("f003", "sales"),
        ]
        groups = _group_by_cluster_hint(manifest)
        assert len(groups) == 2
        assert len(groups["eng"]) == 2
        assert len(groups["sales"]) == 1

    def test_missing_hint_goes_to_misc(self):
        manifest = [{"file_id": "f001"}]
        groups = _group_by_cluster_hint(manifest)
        assert "misc" in groups


class TestBuildCrossRefGraph:
    def test_basic_bidirectional(self):
        manifest = [
            _make_entry("f001", cross_refs=["f002"]),
            _make_entry("f002"),
        ]
        graph = _build_cross_ref_graph(manifest, {"f001", "f002"})
        assert "f002" in graph["f001"]
        assert "f001" in graph["f002"]

    def test_warns_on_missing_ref(self):
        manifest = [
            _make_entry("f001", cross_refs=["f999"]),
        ]
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            _build_cross_ref_graph(manifest, {"f001"})
            assert len(w) == 1
            assert "f999" in str(w[0].message)

    def test_self_reference_ignored(self):
        manifest = [_make_entry("f001", cross_refs=["f001"])]
        graph = _build_cross_ref_graph(manifest, {"f001"})
        assert graph.get("f001", set()) == set()


class TestFindConnectedComponents:
    def test_single_component(self):
        adj = {"a": {"b"}, "b": {"a", "c"}, "c": {"b"}}
        components = _find_connected_components(["a", "b", "c"], adj)
        assert len(components) == 1
        assert set(components[0]) == {"a", "b", "c"}

    def test_two_components(self):
        adj = {"a": {"b"}, "b": {"a"}}
        components = _find_connected_components(["a", "b", "c"], adj)
        assert len(components) == 2

    def test_no_edges(self):
        components = _find_connected_components(["a", "b", "c"], {})
        assert len(components) == 3


# ---------------------------------------------------------------------------
# Tests: splitting and merging
# ---------------------------------------------------------------------------


class TestSplitGroup:
    def test_no_split_needed(self):
        entries = [_make_entry(f"f{i:03d}") for i in range(5)]
        result = _split_group(entries, 8, {})
        assert len(result) == 1
        assert len(result[0]) == 5

    def test_splits_oversize_group(self):
        entries = [_make_entry(f"f{i:03d}") for i in range(12)]
        result = _split_group(entries, 5, {})
        for chunk in result:
            assert len(chunk) <= 5
        # All entries accounted for
        all_ids = {_get_file_id(e) for chunk in result for e in chunk}
        assert len(all_ids) == 12

    def test_keeps_cross_refs_together(self):
        entries = [_make_entry(f"f{i:03d}") for i in range(10)]
        # f000 and f001 cross-reference each other
        adjacency = {"f000": {"f001"}, "f001": {"f000"}}
        result = _split_group(entries, 5, adjacency)
        # f000 and f001 should be in the same chunk
        for chunk in result:
            ids = {_get_file_id(e) for e in chunk}
            if "f000" in ids:
                assert "f001" in ids
                break


class TestTryMergeSingletons:
    def test_singleton_merged_into_referenced_group(self):
        groups = {
            "eng": [_make_entry("f001"), _make_entry("f002")],
            "lone": [_make_entry("f003", cross_refs=["f001"])],
        }
        adjacency = {"f003": {"f001"}, "f001": {"f003"}}
        result = _try_merge_singletons(groups, 8, adjacency)
        assert "lone" not in result
        assert len(result["eng"]) == 3

    def test_singleton_not_merged_if_target_full(self):
        groups = {
            "eng": [_make_entry(f"f{i:03d}") for i in range(8)],  # already at max
            "lone": [_make_entry("f100", cross_refs=["f001"])],
        }
        adjacency = {"f100": {"f001"}, "f001": {"f100"}}
        result = _try_merge_singletons(groups, 8, adjacency)
        assert "lone" in result

    def test_singleton_without_refs_stays(self):
        groups = {
            "eng": [_make_entry("f001")],
            "lone": [_make_entry("f002")],
        }
        result = _try_merge_singletons(groups, 8, {})
        assert "lone" in result


# ---------------------------------------------------------------------------
# Tests: dependency graph and cycle detection
# ---------------------------------------------------------------------------


class TestBuildClusterDependencyGraph:
    def test_cross_cluster_dependency(self):
        manifest = [
            _make_entry("f001", "eng", cross_refs=["f003"]),
            _make_entry("f002", "eng"),
            _make_entry("f003", "sales"),
        ]
        clusters = {
            "eng": [manifest[0], manifest[1]],
            "sales": [manifest[2]],
        }
        file_to_cluster = {"f001": "eng", "f002": "eng", "f003": "sales"}
        deps = _build_cluster_dependency_graph(
            clusters, file_to_cluster, manifest, {"f001", "f002", "f003"}
        )
        assert "sales" in deps.get("eng", set())

    def test_same_cluster_no_dependency(self):
        manifest = [
            _make_entry("f001", "eng", cross_refs=["f002"]),
            _make_entry("f002", "eng"),
        ]
        clusters = {"eng": manifest}
        file_to_cluster = {"f001": "eng", "f002": "eng"}
        deps = _build_cluster_dependency_graph(
            clusters, file_to_cluster, manifest, {"f001", "f002"}
        )
        assert deps.get("eng", set()) == set()


class TestDetectAndMergeCycles:
    def test_no_cycles(self):
        groups = {"a": [_make_entry("f001")], "b": [_make_entry("f002")]}
        deps = {"b": {"a"}}
        new_groups, new_deps = _detect_and_merge_cycles(groups, deps)
        assert set(new_groups.keys()) == {"a", "b"}

    def test_two_node_cycle_merged(self):
        groups = {
            "a": [_make_entry("f001")],
            "b": [_make_entry("f002")],
        }
        deps = {"a": {"b"}, "b": {"a"}}
        new_groups, new_deps = _detect_and_merge_cycles(groups, deps)
        # Should merge into one cluster
        assert len(new_groups) == 1
        merged_key = list(new_groups.keys())[0]
        assert len(new_groups[merged_key]) == 2

    def test_three_node_cycle_merged(self):
        groups = {
            "a": [_make_entry("f001")],
            "b": [_make_entry("f002")],
            "c": [_make_entry("f003")],
        }
        deps = {"a": {"b"}, "b": {"c"}, "c": {"a"}}
        new_groups, new_deps = _detect_and_merge_cycles(groups, deps)
        assert len(new_groups) == 1

    def test_partial_cycle_with_external_dep(self):
        groups = {
            "a": [_make_entry("f001")],
            "b": [_make_entry("f002")],
            "c": [_make_entry("f003")],
        }
        # a <-> b form a cycle, c depends on a
        deps = {"a": {"b"}, "b": {"a"}, "c": {"a"}}
        new_groups, new_deps = _detect_and_merge_cycles(groups, deps)
        assert len(new_groups) == 2
        # c should depend on the merged a/b cluster
        merged = [k for k in new_groups if k != "c"][0]
        assert merged in new_deps.get("c", set())


# ---------------------------------------------------------------------------
# Tests: topological sort
# ---------------------------------------------------------------------------


class TestTopologicalSortWithLevels:
    def test_no_deps(self):
        result = _topological_sort_with_levels(["a", "b", "c"], {})
        assert all(level == 0 for _, level in result)
        assert len(result) == 3

    def test_linear_chain(self):
        # c depends on b, b depends on a
        deps = {"c": {"b"}, "b": {"a"}}
        result = _topological_sort_with_levels(["a", "b", "c"], deps)
        levels = {cid: lvl for cid, lvl in result}
        assert levels["a"] == 0
        assert levels["b"] == 1
        assert levels["c"] == 2

    def test_diamond_shape(self):
        # d depends on b and c, b and c depend on a
        deps = {"b": {"a"}, "c": {"a"}, "d": {"b", "c"}}
        result = _topological_sort_with_levels(["a", "b", "c", "d"], deps)
        levels = {cid: lvl for cid, lvl in result}
        assert levels["a"] == 0
        assert levels["b"] == 1
        assert levels["c"] == 1
        assert levels["d"] == 2

    def test_sorted_by_level_then_id(self):
        deps = {"b": {"a"}, "c": {"a"}}
        result = _topological_sort_with_levels(["c", "b", "a"], deps)
        assert result[0] == ("a", 0)
        # b and c are both level 1, sorted alphabetically
        assert result[1] == ("b", 1)
        assert result[2] == ("c", 1)


# ---------------------------------------------------------------------------
# Tests: assign_clusters (integration)
# ---------------------------------------------------------------------------


class TestAssignClusters:
    def test_empty_manifest(self):
        assert assign_clusters([], {}) == []

    def test_basic_clustering(self):
        manifest = [
            _make_entry("f001", "eng"),
            _make_entry("f002", "eng"),
            _make_entry("f003", "sales"),
        ]
        clusters = assign_clusters(manifest, {})
        assert len(clusters) == 2
        cluster_ids = {c.cluster_id for c in clusters}
        assert "eng" in cluster_ids
        assert "sales" in cluster_ids

    def test_cluster_max_size_enforced(self):
        manifest = [_make_entry(f"f{i:03d}", "big") for i in range(15)]
        clusters = assign_clusters(manifest, {}, max_cluster_size=5)
        for c in clusters:
            assert len(c.file_entries) <= 5
        total_files = sum(len(c.file_entries) for c in clusters)
        assert total_files == 15

    def test_cross_cluster_dependencies(self):
        # Each cluster must have >1 file to avoid singleton merge
        manifest = [
            _make_entry("f001", "eng", cross_refs=["f003"]),
            _make_entry("f002", "eng"),
            _make_entry("f003", "sales"),
            _make_entry("f004", "sales"),
        ]
        clusters = assign_clusters(manifest, {})
        eng_cluster = next(c for c in clusters if c.cluster_id == "eng")
        # eng depends on sales because f001 references f003
        assert "sales" in eng_cluster.depends_on

    def test_levels_assigned_correctly(self):
        # Each cluster needs >1 file to avoid singleton merge
        manifest = [
            _make_entry("f001", "base"),
            _make_entry("f001b", "base"),
            _make_entry("f002", "mid", cross_refs=["f001"]),
            _make_entry("f002b", "mid"),
            _make_entry("f003", "top", cross_refs=["f002"]),
            _make_entry("f003b", "top"),
        ]
        clusters = assign_clusters(manifest, {})
        level_map = {c.cluster_id: c.level for c in clusters}
        assert level_map["base"] == 0
        assert level_map["mid"] == 1
        assert level_map["top"] == 2

    def test_clusters_ordered_by_level(self):
        # Each cluster needs >1 file to avoid singleton merge
        manifest = [
            _make_entry("f001", "base"),
            _make_entry("f001b", "base"),
            _make_entry("f002", "mid", cross_refs=["f001"]),
            _make_entry("f002b", "mid"),
            _make_entry("f003", "top", cross_refs=["f002"]),
            _make_entry("f003b", "top"),
        ]
        clusters = assign_clusters(manifest, {})
        levels = [c.level for c in clusters]
        assert levels == sorted(levels)

    def test_fact_sharding_integrated(self):
        manifest = [
            _make_entry("f001", "eng"),
            _make_entry("f005", "ops"),
        ]
        registry = _sample_fact_registry()
        clusters = assign_clusters(manifest, registry)
        eng = next(c for c in clusters if c.cluster_id == "eng")
        ops = next(c for c in clusters if c.cluster_id == "ops")

        # eng cluster (f001): should have date_kickoff, budget_q1, ref_contract, hq_office
        eng_date_ids = {d["id"] for d in eng.fact_shard.get("dates", [])}
        assert "date_kickoff" in eng_date_ids
        assert "date_launch" not in eng_date_ids

        # ops cluster (f005): should have date_launch, branch_office
        ops_location_ids = {l["id"] for l in ops.fact_shard.get("locations", [])}
        assert "branch_office" in ops_location_ids
        assert "hq_office" not in ops_location_ids

    def test_missing_cluster_hint_goes_to_misc(self):
        manifest = [{"file_id": "f001"}, {"file_id": "f002"}]
        clusters = assign_clusters(manifest, {})
        assert len(clusters) == 1
        assert clusters[0].cluster_id == "misc"

    def test_circular_dependencies_merged(self):
        manifest = [
            _make_entry("f001", "alpha", cross_refs=["f003"]),
            _make_entry("f002", "alpha"),
            _make_entry("f003", "beta", cross_refs=["f001"]),
            _make_entry("f004", "beta"),
        ]
        clusters = assign_clusters(manifest, {})
        # alpha and beta form a cycle — should be merged
        assert len(clusters) == 1
        assert len(clusters[0].file_entries) == 4
        assert clusters[0].depends_on == []

    def test_cross_ref_to_unknown_file_warns(self):
        manifest = [
            _make_entry("f001", "eng", cross_refs=["f999"]),
        ]
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            clusters = assign_clusters(manifest, {})
            assert len(clusters) == 1
            assert any("f999" in str(warning.message) for warning in w)

    def test_singleton_merged_into_cross_ref_group(self):
        manifest = [
            _make_entry("f001", "eng"),
            _make_entry("f002", "eng"),
            _make_entry("f003", "lone", cross_refs=["f001"]),
        ]
        clusters = assign_clusters(manifest, {}, max_cluster_size=8)
        # f003 singleton should merge into eng
        cluster_ids = {c.cluster_id for c in clusters}
        assert "lone" not in cluster_ids
        eng = next(c for c in clusters if c.cluster_id == "eng")
        eng_file_ids = {_get_file_id(e) for e in eng.file_entries}
        assert "f003" in eng_file_ids

    def test_returns_cluster_dataclass(self):
        manifest = [_make_entry("f001", "eng")]
        clusters = assign_clusters(manifest, {})
        assert len(clusters) == 1
        c = clusters[0]
        assert isinstance(c, Cluster)
        assert c.cluster_id == "eng"
        assert len(c.file_entries) == 1
        assert isinstance(c.fact_shard, dict)
        assert isinstance(c.depends_on, list)
        assert isinstance(c.level, int)

    def test_large_corpus_sharding(self):
        """Simulate a large corpus with 250+ files across many departments."""
        manifest = []
        departments = ["eng", "sales", "hr", "legal", "ops", "finance", "marketing", "support"]
        fid = 1
        for dept in departments:
            for _ in range(32):  # 32 files per dept = 256 total
                manifest.append(_make_entry(f"f{fid:04d}", dept))
                fid += 1

        # Add some cross-refs
        manifest[0]["cross_references"] = ["f0033"]  # eng -> sales
        manifest[64]["cross_references"] = ["f0001"]  # hr -> eng

        registry = {
            "scenario_id": "dp_large",
            "people": [{"id": "p1", "full_name": "Test Person"}],
            "organizations": [],
            "dates": [
                {"id": f"d{i}", "date": "2024-01-01", "files": [f"f{i:04d}"]}
                for i in range(1, 257)
            ],
        }

        clusters = assign_clusters(manifest, registry, max_cluster_size=8)

        # Verify all files accounted for
        total = sum(len(c.file_entries) for c in clusters)
        assert total == 256

        # Verify no cluster exceeds max size
        for c in clusters:
            assert len(c.file_entries) <= 8

        # Verify fact shards are smaller than full registry
        for c in clusters:
            shard_date_count = len(c.fact_shard.get("dates", []))
            assert shard_date_count <= len(c.file_entries)

        # Verify levels are sorted
        levels = [c.level for c in clusters]
        assert levels == sorted(levels)
