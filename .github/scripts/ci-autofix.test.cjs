const assert = require("node:assert/strict")
const { execFileSync } = require("node:child_process")
const {
	mkdtempSync,
	writeFileSync,
	readFileSync,
	mkdirSync,
	rmSync,
} = require("node:fs")
const { tmpdir } = require("node:os")
const { join } = require("node:path")
const { test } = require("node:test")
const {
	resolveRevision,
	revalidate,
	createPatch,
	publish,
} = require("./ci-autofix.cjs")

const H = "a".repeat(40)
const N = "b".repeat(40)
const M = "c".repeat(40)
const repository = "owner/repository"
const revision = { repository, prNumber: 1, branch: "feature/fix", headSha: H }

function apiFixture(runOverrides = {}, prOverrides = {}) {
	const pr = {
		state: "open",
		merged: false,
		head: { sha: H, ref: revision.branch, repo: { full_name: repository } },
		base: { repo: { full_name: repository } },
		...prOverrides,
	}
	const run = {
		event: "pull_request",
		conclusion: "failure",
		head_sha: H,
		head_branch: revision.branch,
		head_repository: { full_name: repository },
		pull_requests: [{ number: 1, head: { sha: N } }],
		...runOverrides,
	}
	return {
		pr,
		github: { rest: { pulls: { get: async () => ({ data: pr }) } } },
		// The workflow's own SHA is unrelated to the failed PR source revision.
		context: {
			repo: { owner: "owner", repo: "repository" },
			sha: M,
			payload: { workflow_run: run },
		},
		core: { info: () => {} },
	}
}

test("uses immutable run source SHA despite mutable linked PR metadata and merge SHA", async () => {
	assert.deepEqual(await resolveRevision(apiFixture()), revision)
})

for (const [name, changes] of [
	[
		"advanced head",
		{ head: { sha: N, ref: revision.branch, repo: { full_name: repository } } },
	],
	["closed PR", { state: "closed" }],
	["merged PR", { merged: true }],
	[
		"fork head",
		{
			head: {
				sha: H,
				ref: revision.branch,
				repo: { full_name: "fork/repository" },
			},
		},
	],
	[
		"changed branch",
		{ head: { sha: H, ref: "other", repo: { full_name: repository } } },
	],
]) {
	test(`skips ${name} before editing and before publication`, async () => {
		const fixture = apiFixture({}, changes)
		assert.equal(await resolveRevision(fixture), null)
		assert.equal(await revalidate(fixture, revision), false)
	})
}

for (const [name, changes] of [
	["missing PR", { pull_requests: [] }],
	["missing PR number", { pull_requests: [{}] }],
	["missing source branch", { head_branch: "" }],
	["ambiguous PR", { pull_requests: [{ number: 1 }, { number: 2 }] }],
	["invalid source SHA", { head_sha: "branch" }],
	["different event", { event: "push" }],
	["successful CI", { conclusion: "success" }],
	["fork run", { head_repository: { full_name: "fork/repository" } }],
	["merge SHA without matching source", { head_sha: M }],
]) {
	test(`skips ${name} rather than guessing a revision`, async () => {
		assert.equal(await resolveRevision(apiFixture(changes)), null)
	})
}

test("revalidation catches a push after initial eligibility", async () => {
	const fixture = apiFixture()
	assert.deepEqual(await resolveRevision(fixture), revision)
	fixture.pr.head.sha = N
	assert.equal(await revalidate(fixture, revision), false)
})

function git(cwd, ...args) {
	return execFileSync("git", args, {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim()
}

function gitFixture(t) {
	const root = mkdtempSync(join(tmpdir(), "ci-autofix-test-"))
	t.after(() => rmSync(root, { recursive: true, force: true }))
	const remote = join(root, "remote.git")
	const edit = join(root, "edit")
	const writer = join(root, "writer")
	const publisher = join(root, "publisher")
	mkdirSync(edit)
	git(root, "init", "--bare", remote)
	git(edit, "init")
	git(edit, "config", "user.name", "Fixture")
	git(edit, "config", "user.email", "fixture@example.invalid")
	writeFileSync(join(edit, "code.txt"), "failing source\n")
	git(edit, "add", ".")
	git(edit, "commit", "-m", "H")
	const headSha = git(edit, "rev-parse", "HEAD")
	git(edit, "remote", "add", "origin", remote)
	git(edit, "push", "origin", "HEAD:refs/heads/feature/fix")
	for (const path of [writer, publisher]) {
		git(root, "clone", "--branch", "feature/fix", remote, path)
		git(path, "config", "user.name", "Fixture")
		git(path, "config", "user.email", "fixture@example.invalid")
	}
	const patchPath = join(root, "fix.patch")
	return {
		root,
		edit,
		writer,
		publisher,
		remote,
		patchPath,
		revision: { ...revision, headSha },
	}
}

function makeFix(f) {
	writeFileSync(join(f.edit, "code.txt"), "fixed source\n")
	writeFileSync(join(f.edit, "new.bin"), Buffer.from([0, 1, 2, 3]))
	assert.equal(
		createPatch({
			headSha: f.revision.headSha,
			patchPath: f.patchPath,
			cwd: f.edit,
		}),
		true,
	)
}

function advance(f) {
	writeFileSync(join(f.writer, "code.txt"), "developer fixed it\n")
	git(f.writer, "add", ".")
	git(f.writer, "commit", "-m", "N")
	git(f.writer, "push", "origin", "HEAD:refs/heads/feature/fix")
	return git(f.writer, "rev-parse", "HEAD")
}

test("no edits means no artifact or publish job", (t) => {
	const f = gitFixture(t)
	assert.equal(
		createPatch({
			headSha: f.revision.headSha,
			patchPath: f.patchPath,
			cwd: f.edit,
		}),
		false,
	)
})

test("publishes tracked and new binary edits on unchanged H", (t) => {
	const f = gitFixture(t)
	makeFix(f)
	assert.equal(
		publish({ revision: f.revision, patchPath: f.patchPath, cwd: f.publisher }),
		true,
	)
	const fixed = git(f.publisher, "rev-parse", "HEAD")
	assert.equal(git(f.remote, "rev-parse", "refs/heads/feature/fix"), fixed)
	assert.equal(git(f.publisher, "rev-parse", "HEAD^"), f.revision.headSha)
	assert.deepEqual(
		readFileSync(join(f.publisher, "new.bin")),
		Buffer.from([0, 1, 2, 3]),
	)
})

test("patch includes local commits as well as later working-tree edits", (t) => {
	const f = gitFixture(t)
	writeFileSync(join(f.edit, "committed.txt"), "local fix\n")
	git(f.edit, "add", ".")
	git(f.edit, "commit", "-m", "local fix")
	makeFix(f)
	assert.equal(
		publish({ revision: f.revision, patchPath: f.patchPath, cwd: f.publisher }),
		true,
	)
	assert.equal(
		readFileSync(join(f.publisher, "committed.txt"), "utf8"),
		"local fix\n",
	)
})

test("skips publishing when branch advances while Claude edits", (t) => {
	const f = gitFixture(t)
	makeFix(f)
	const next = advance(f)
	assert.equal(
		publish({ revision: f.revision, patchPath: f.patchPath, cwd: f.publisher }),
		false,
	)
	assert.equal(git(f.remote, "rev-parse", "refs/heads/feature/fix"), next)
})

test("does not recreate a deleted PR branch", (t) => {
	const f = gitFixture(t)
	makeFix(f)
	git(f.writer, "push", "origin", ":refs/heads/feature/fix")
	assert.equal(
		publish({ revision: f.revision, patchPath: f.patchPath, cwd: f.publisher }),
		false,
	)
})

test("explicit lease rejects a push racing after the remote-head check", (t) => {
	const f = gitFixture(t)
	makeFix(f)
	writeFileSync(join(f.writer, "code.txt"), "racing developer fix\n")
	git(f.writer, "add", ".")
	git(f.writer, "commit", "-m", "N raced")
	const next = git(f.writer, "rev-parse", "HEAD")
	const quote = (s) => `'${s.replaceAll("'", "'\\''")}'`
	writeFileSync(
		join(f.publisher, ".git/hooks/pre-push"),
		`#!/bin/sh\nexec git -C ${quote(f.writer)} push origin HEAD:refs/heads/feature/fix\n`,
		{ mode: 0o755 },
	)
	assert.throws(() =>
		publish({ revision: f.revision, patchPath: f.patchPath, cwd: f.publisher }),
	)
	assert.equal(git(f.remote, "rev-parse", "refs/heads/feature/fix"), next)
})
