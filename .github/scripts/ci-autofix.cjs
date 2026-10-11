const { execFileSync } = require("node:child_process")
const { writeFileSync } = require("node:fs")

const isSha = (value) =>
	typeof value === "string" && /^[a-f0-9]{40}$/.test(value)

function currentPullRequest(pr, revision) {
	return (
		pr.state === "open" &&
		!pr.merged &&
		pr.head?.repo?.full_name === revision.repository &&
		pr.base?.repo?.full_name === revision.repository &&
		pr.head?.ref === revision.branch &&
		pr.head?.sha === revision.headSha
	)
}

async function resolveRevision({ github, context, core }) {
	const run = context.payload.workflow_run
	const repository = `${context.repo.owner}/${context.repo.repo}`
	if (
		run.event !== "pull_request" ||
		run.conclusion !== "failure" ||
		run.head_repository?.full_name !== repository ||
		!isSha(run.head_sha) ||
		!run.head_branch
	) {
		core.info("Skipping: no unambiguous same-repository failed PR revision.")
		return null
	}
	// Some same-repository runs have no linked PRs. Resolve only an unambiguous
	// open PR for the recorded branch; revalidation still requires the run SHA.
	let pullRequests = run.pull_requests ?? []
	if (pullRequests.length === 0) {
		const { data } = await github.rest.pulls.list({
			...context.repo,
			state: "open",
			head: `${context.repo.owner}:${run.head_branch}`,
			per_page: 2,
		})
		pullRequests = data
	}
	if (
		pullRequests.length !== 1 ||
		!Number.isSafeInteger(pullRequests[0].number)
	) {
		core.info("Skipping: no unambiguous PR for the failed run.")
		return null
	}
	// Linked PR objects can reflect a newer head. Only the run's head_sha is
	// immutable. This is the PR source SHA, not pull_request CI's merge checkout.
	const revision = {
		repository,
		prNumber: pullRequests[0].number,
		branch: run.head_branch,
		headSha: run.head_sha,
	}
	if (!(await revalidate({ github, context, core }, revision))) return null
	return revision
}

async function revalidate({ github, context, core }, revision) {
	const { data: pr } = await github.rest.pulls.get({
		...context.repo,
		pull_number: revision.prNumber,
	})
	if (!currentPullRequest(pr, revision)) {
		core.info("Skipping: PR closed, moved, or advanced beyond the failed run.")
		return false
	}
	return true
}

function git(args, cwd) {
	return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}

function createPatch({ headSha, patchPath, cwd = process.cwd() }) {
	if (!isSha(headSha)) throw new Error("Invalid source SHA")
	git(["merge-base", "--is-ancestor", headSha, "HEAD"], cwd)
	git(["add", "--all"], cwd)
	// Include both local commits and staged edits, while preserving binary diffs.
	const patch = execFileSync(
		"git",
		["diff", "--cached", "--binary", headSha, "--"],
		{ cwd },
	)
	writeFileSync(patchPath, patch)
	return patch.length > 0
}

function publish({ revision, patchPath, cwd = process.cwd() }) {
	const { branch, headSha } = revision
	if (!isSha(headSha)) throw new Error("Invalid source SHA")
	const ref = `refs/heads/${branch}`
	git(["check-ref-format", ref], cwd)
	if (git(["rev-parse", "HEAD"], cwd) !== headSha) {
		throw new Error(
			"Publish checkout does not match the failed source revision",
		)
	}
	const remoteHead = git(["ls-remote", "--heads", "origin", ref], cwd)
	if (remoteHead.split(/\s+/)[0] !== headSha) return false
	git(["apply", "--index", patchPath], cwd)
	git(
		[
			"-c",
			"user.name=claude[bot]",
			"-c",
			"user.email=claude[bot]@users.noreply.github.com",
			"commit",
			"-m",
			"fix: resolve CI failures",
		],
		cwd,
	)
	// This explicit lease is a compare-and-swap, even if the branch advances
	// after ls-remote. The new commit is based on headSha, so no history is lost.
	try {
		git(
			["push", `--force-with-lease=${ref}:${headSha}`, "origin", `HEAD:${ref}`],
			cwd,
		)
	} catch (error) {
		// A late branch update is an expected stale result, not a workflow failure.
		if (
			git(["ls-remote", "--heads", "origin", ref], cwd).split(/\s+/)[0] !==
			headSha
		) {
			return false
		}
		throw error
	}
	return true
}

module.exports = {
	resolveRevision,
	revalidate,
	createPatch,
	publish,
}
