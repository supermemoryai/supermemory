"""Phase 4: Cluster assignment with topological sort and fact registry sharding.

Takes a file manifest and a fact registry, groups files into generation clusters,
topologically sorts them so dependencies generate first, and shards the fact
registry so each worker receives only the facts it needs.
"""

from __future__ import annotations

import logging
import warnings
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Public data types
# ---------------------------------------------------------------------------

MIN_CLUSTER_SIZE = 1
DEFAULT_MAX_CLUSTER_SIZE = 8

# Categories in the fact registry that are scoped to specific files.
_SCOPED_CATEGORIES = ("dates", "financial", "references", "locations", "domain_facts")

# Categories that are global — every worker needs these.
_GLOBAL_CATEGORIES = ("people", "organizations")


@dataclass
class Cluster:
    """A group of related files to be generated together."""

    cluster_id: str
    file_entries: list[dict] = field(default_factory=list)
    fact_shard: dict = field(default_factory=dict)
    depends_on: list[str] = field(default_factory=list)
    level: int = 0


# ---------------------------------------------------------------------------
# Fact registry sharding
# ---------------------------------------------------------------------------


def shard_fact_registry(fact_registry: dict, cluster_file_ids: list[str]) -> dict:
    """Return a subset of the fact registry relevant to the given file IDs.

    Always includes: all people, all organizations (these are global).
    Filters: dates, financial, references, locations, domain_facts — only those
    whose 'files' array intersects with cluster_file_ids.
    Cross_references: only those where source or target is in cluster_file_ids.
    """
    file_id_set = set(cluster_file_ids)
    shard: dict[str, Any] = {}

    # Copy top-level scalar fields (e.g. scenario_id)
    for key, value in fact_registry.items():
        if not isinstance(value, list):
            shard[key] = value

    # Global categories — always included in full
    for category in _GLOBAL_CATEGORIES:
        if category in fact_registry:
            shard[category] = list(fact_registry[category])

    # Scoped categories — filter to entries whose files intersect
    for category in _SCOPED_CATEGORIES:
        if category not in fact_registry:
            continue
        filtered = [
            entry
            for entry in fact_registry[category]
            if file_id_set.intersection(entry.get("files", []))
        ]
        shard[category] = filtered

    # Cross-references — keep only those touching our files
    if "cross_references" in fact_registry:
        shard["cross_references"] = [
            xref
            for xref in fact_registry["cross_references"]
            if xref.get("source_file") in file_id_set
            or xref.get("target_file") in file_id_set
        ]

    return shard


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_file_id(entry: dict) -> str:
    """Extract the file_id from a manifest entry."""
    return entry.get("file_id", "")


def _get_cluster_hint(entry: dict) -> str:
    """Extract the cluster_hint from a manifest entry, defaulting to 'misc'."""
    return entry.get("cluster_hint", "misc") or "misc"


def _get_cross_references(entry: dict) -> list[str]:
    """Extract cross_references from a manifest entry."""
    refs = entry.get("cross_references", [])
    if isinstance(refs, list):
        return refs
    return []


def _build_file_id_to_entry(manifest: list[dict]) -> dict[str, dict]:
    """Build a lookup from file_id to manifest entry."""
    return {_get_file_id(e): e for e in manifest if _get_file_id(e)}


def _group_by_cluster_hint(manifest: list[dict]) -> dict[str, list[dict]]:
    """Group manifest entries by their cluster_hint field."""
    groups: dict[str, list[dict]] = defaultdict(list)
    for entry in manifest:
        hint = _get_cluster_hint(entry)
        groups[hint].append(entry)
    return dict(groups)


def _build_cross_ref_graph(
    manifest: list[dict], valid_file_ids: set[str]
) -> dict[str, set[str]]:
    """Build an adjacency list of cross-references between files.

    Returns a mapping from file_id -> set of file_ids it references.
    Warns and ignores references to files not in the manifest.
    """
    graph: dict[str, set[str]] = defaultdict(set)
    for entry in manifest:
        fid = _get_file_id(entry)
        for ref in _get_cross_references(entry):
            if ref not in valid_file_ids:
                warnings.warn(
                    f"File '{fid}' cross-references '{ref}' which is not in the manifest; ignoring.",
                    stacklevel=2,
                )
                continue
            if ref != fid:
                graph[fid].add(ref)
                graph[ref].add(fid)  # bidirectional for clustering purposes
    return dict(graph)


def _find_connected_components(
    file_ids: list[str], adjacency: dict[str, set[str]]
) -> list[list[str]]:
    """Find connected components within a set of file_ids using the adjacency graph."""
    id_set = set(file_ids)
    visited: set[str] = set()
    components: list[list[str]] = []

    for fid in file_ids:
        if fid in visited:
            continue
        component: list[str] = []
        queue = deque([fid])
        while queue:
            current = queue.popleft()
            if current in visited or current not in id_set:
                continue
            visited.add(current)
            component.append(current)
            for neighbor in adjacency.get(current, set()):
                if neighbor in id_set and neighbor not in visited:
                    queue.append(neighbor)
        if component:
            components.append(component)

    return components


def _split_group(
    entries: list[dict],
    max_size: int,
    adjacency: dict[str, set[str]],
) -> list[list[dict]]:
    """Split a group that exceeds max_size into smaller chunks.

    Keeps cross-referencing files together where possible.
    """
    file_ids = [_get_file_id(e) for e in entries]
    id_to_entry = {_get_file_id(e): e for e in entries}

    # Find connected components within this group
    components = _find_connected_components(file_ids, adjacency)

    # Build sub-groups, packing components into chunks up to max_size
    sub_groups: list[list[dict]] = []
    current: list[dict] = []

    for component in components:
        component_entries = [id_to_entry[fid] for fid in component]

        if len(component_entries) > max_size:
            # Component itself is too big — forcibly split it
            if current:
                sub_groups.append(current)
                current = []
            for i in range(0, len(component_entries), max_size):
                sub_groups.append(component_entries[i : i + max_size])
        elif len(current) + len(component_entries) > max_size:
            # Adding this component would exceed limit — start a new chunk
            if current:
                sub_groups.append(current)
            current = list(component_entries)
        else:
            current.extend(component_entries)

    if current:
        sub_groups.append(current)

    return sub_groups


def _try_merge_singletons(
    groups: dict[str, list[dict]],
    max_size: int,
    adjacency: dict[str, set[str]],
) -> dict[str, list[dict]]:
    """Merge singleton groups into a group they cross-reference, if room allows."""
    singleton_keys = [k for k, v in groups.items() if len(v) == 1]
    file_to_group: dict[str, str] = {}
    for gkey, entries in groups.items():
        for entry in entries:
            file_to_group[_get_file_id(entry)] = gkey

    merged_into: dict[str, str] = {}  # singleton_key -> target_key

    for skey in singleton_keys:
        entry = groups[skey][0]
        fid = _get_file_id(entry)
        refs = adjacency.get(fid, set())
        for ref in refs:
            target_group = file_to_group.get(ref)
            if (
                target_group
                and target_group != skey
                and target_group not in merged_into.values()  # don't chain-merge
                and len(groups[target_group]) < max_size
            ):
                groups[target_group].append(entry)
                file_to_group[fid] = target_group
                merged_into[skey] = target_group
                break

    for skey in merged_into:
        del groups[skey]

    return groups


def _build_cluster_dependency_graph(
    clusters: dict[str, list[dict]],
    file_to_cluster: dict[str, str],
    manifest: list[dict],
    valid_file_ids: set[str],
) -> dict[str, set[str]]:
    """Build a DAG of cluster dependencies from cross-references.

    If a file in cluster A references a file in cluster B (and A != B),
    then A depends on B (B must generate before A).

    Returns: mapping from cluster_id -> set of cluster_ids it depends on.
    """
    deps: dict[str, set[str]] = defaultdict(set)

    for entry in manifest:
        fid = _get_file_id(entry)
        source_cluster = file_to_cluster.get(fid)
        if not source_cluster:
            continue
        for ref in _get_cross_references(entry):
            if ref not in valid_file_ids:
                continue
            target_cluster = file_to_cluster.get(ref)
            if target_cluster and target_cluster != source_cluster:
                deps[source_cluster].add(target_cluster)

    return dict(deps)


def _detect_and_merge_cycles(
    cluster_groups: dict[str, list[dict]],
    deps: dict[str, set[str]],
) -> tuple[dict[str, list[dict]], dict[str, set[str]]]:
    """Detect cycles in the dependency graph and merge cyclic clusters.

    Uses Tarjan-like SCC detection via iterative DFS.
    Returns updated cluster_groups and deps with cycles removed.
    """
    all_ids = set(cluster_groups.keys())

    # Iterative Tarjan's SCC algorithm
    index_counter = [0]
    stack: list[str] = []
    on_stack: set[str] = set()
    indices: dict[str, int] = {}
    lowlinks: dict[str, int] = {}
    sccs: list[list[str]] = []

    def strongconnect(v: str) -> None:
        # Iterative version using explicit call stack
        call_stack: list[tuple[str, list[str], int]] = []
        indices[v] = lowlinks[v] = index_counter[0]
        index_counter[0] += 1
        stack.append(v)
        on_stack.add(v)

        neighbors = sorted(deps.get(v, set()) & all_ids)
        call_stack.append((v, neighbors, 0))

        while call_stack:
            node, nbrs, idx = call_stack[-1]
            if idx < len(nbrs):
                call_stack[-1] = (node, nbrs, idx + 1)
                w = nbrs[idx]
                if w not in indices:
                    indices[w] = lowlinks[w] = index_counter[0]
                    index_counter[0] += 1
                    stack.append(w)
                    on_stack.add(w)
                    w_neighbors = sorted(deps.get(w, set()) & all_ids)
                    call_stack.append((w, w_neighbors, 0))
                elif w in on_stack:
                    lowlinks[node] = min(lowlinks[node], indices[w])
            else:
                # All neighbors processed
                if lowlinks[node] == indices[node]:
                    scc: list[str] = []
                    while True:
                        w = stack.pop()
                        on_stack.discard(w)
                        scc.append(w)
                        if w == node:
                            break
                    sccs.append(scc)

                call_stack.pop()
                if call_stack:
                    parent = call_stack[-1][0]
                    lowlinks[parent] = min(lowlinks[parent], lowlinks[node])

    for cid in sorted(all_ids):
        if cid not in indices:
            strongconnect(cid)

    # Merge SCCs with more than one node
    merge_map: dict[str, str] = {}  # old_id -> merged_id
    for scc in sccs:
        if len(scc) <= 1:
            continue
        # Merge all into the first (alphabetically sorted)
        scc_sorted = sorted(scc)
        primary = scc_sorted[0]
        for cid in scc_sorted[1:]:
            merge_map[cid] = primary
            cluster_groups[primary].extend(cluster_groups.pop(cid))
        logger.info(
            "Merged cyclic clusters %s into '%s'", scc_sorted[1:], primary
        )

    if not merge_map:
        return cluster_groups, deps

    # Rebuild dependency graph with merged IDs
    new_deps: dict[str, set[str]] = defaultdict(set)
    for cid, dep_set in deps.items():
        resolved_cid = merge_map.get(cid, cid)
        if resolved_cid not in cluster_groups:
            continue
        for d in dep_set:
            resolved_d = merge_map.get(d, d)
            if resolved_d != resolved_cid and resolved_d in cluster_groups:
                new_deps[resolved_cid].add(resolved_d)

    return cluster_groups, dict(new_deps)


def _topological_sort_with_levels(
    cluster_ids: list[str],
    deps: dict[str, set[str]],
) -> list[tuple[str, int]]:
    """Kahn's algorithm producing (cluster_id, level) pairs.

    Level 0 = no dependencies. Level N = max dependency level + 1.
    Returns pairs sorted by level, then cluster_id.
    """
    all_ids = set(cluster_ids)

    # Build in-degree and adjacency
    in_degree: dict[str, int] = {cid: 0 for cid in all_ids}
    # forward edges: dep -> [dependents]
    forward: dict[str, list[str]] = defaultdict(list)

    for cid in all_ids:
        for dep in deps.get(cid, set()):
            if dep in all_ids:
                in_degree[cid] += 1
                forward[dep].append(cid)

    # Initialize queue with all nodes that have in-degree 0
    queue: deque[str] = deque()
    levels: dict[str, int] = {}
    for cid in sorted(all_ids):
        if in_degree[cid] == 0:
            queue.append(cid)
            levels[cid] = 0

    result: list[tuple[str, int]] = []
    while queue:
        current = queue.popleft()
        result.append((current, levels[current]))
        for dependent in forward.get(current, []):
            in_degree[dependent] -= 1
            levels[dependent] = max(
                levels.get(dependent, 0), levels[current] + 1
            )
            if in_degree[dependent] == 0:
                queue.append(dependent)

    # Safety check: if we didn't visit all nodes, there's an unexpected cycle
    if len(result) < len(all_ids):
        missing = all_ids - {cid for cid, _ in result}
        logger.warning(
            "Topological sort did not visit all clusters. "
            "Remaining (possible cycle): %s. Assigning max level.",
            missing,
        )
        max_level = max((lvl for _, lvl in result), default=0) + 1
        for cid in sorted(missing):
            result.append((cid, max_level))

    result.sort(key=lambda pair: (pair[1], pair[0]))
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def assign_clusters(
    manifest: list[dict],
    fact_registry: dict,
    max_cluster_size: int = DEFAULT_MAX_CLUSTER_SIZE,
) -> list[Cluster]:
    """Group files into clusters, topologically sort, and shard fact registry.

    Returns clusters ordered by level (level 0 first, then level 1, etc.).
    Within a level, clusters can run in parallel.

    Algorithm:
        1. Group files by cluster_hint from manifest
        2. Split oversize groups (keeping cross-referencing files together)
        3. Merge singletons into groups they cross-reference if room allows
        4. Build cross-cluster dependency graph from cross_references
        5. Detect and merge cycles
        6. Topological sort using Kahn's algorithm
        7. Assign levels (distance from root in the DAG)
        8. Shard fact registry for each cluster
    """
    if not manifest:
        return []

    valid_file_ids = {_get_file_id(e) for e in manifest if _get_file_id(e)}
    file_id_to_entry = _build_file_id_to_entry(manifest)

    # Step 1: Group by cluster_hint
    groups = _group_by_cluster_hint(manifest)

    # Build cross-reference adjacency for splitting/merging decisions
    adjacency = _build_cross_ref_graph(manifest, valid_file_ids)

    # Step 2: Split oversize groups
    split_groups: dict[str, list[dict]] = {}
    for hint, entries in groups.items():
        if len(entries) <= max_cluster_size:
            split_groups[hint] = entries
        else:
            sub_groups = _split_group(entries, max_cluster_size, adjacency)
            for i, sub in enumerate(sub_groups):
                key = f"{hint}_{i}" if len(sub_groups) > 1 else hint
                split_groups[key] = sub

    # Step 3: Merge singletons
    split_groups = _try_merge_singletons(split_groups, max_cluster_size, adjacency)

    # Build file_to_cluster mapping
    file_to_cluster: dict[str, str] = {}
    for cid, entries in split_groups.items():
        for entry in entries:
            file_to_cluster[_get_file_id(entry)] = cid

    # Step 4: Build cross-cluster dependency graph
    deps = _build_cluster_dependency_graph(
        split_groups, file_to_cluster, manifest, valid_file_ids
    )

    # Step 5: Detect and merge cycles
    split_groups, deps = _detect_and_merge_cycles(split_groups, deps)

    # Rebuild file_to_cluster after potential merges
    file_to_cluster = {}
    for cid, entries in split_groups.items():
        for entry in entries:
            file_to_cluster[_get_file_id(entry)] = cid

    # Rebuild deps after merge (edges may have changed)
    deps = _build_cluster_dependency_graph(
        split_groups, file_to_cluster, manifest, valid_file_ids
    )

    # Steps 6-7: Topological sort with levels
    sorted_pairs = _topological_sort_with_levels(
        list(split_groups.keys()), deps
    )

    # Step 8: Build Cluster objects with sharded fact registries
    clusters: list[Cluster] = []
    for cluster_id, level in sorted_pairs:
        entries = split_groups[cluster_id]
        cluster_file_ids = [_get_file_id(e) for e in entries]
        fact_shard = shard_fact_registry(fact_registry, cluster_file_ids)
        depends_on = sorted(deps.get(cluster_id, set()))

        clusters.append(
            Cluster(
                cluster_id=cluster_id,
                file_entries=entries,
                fact_shard=fact_shard,
                depends_on=depends_on,
                level=level,
            )
        )

    return clusters
