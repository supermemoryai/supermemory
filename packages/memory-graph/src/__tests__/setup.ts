/**
 * Vitest setup: patch React 19 shared internals to ensure a single hooks
 * dispatcher across react and react-dom instances in bun workspace monorepo.
 *
 * In bun workspaces with vitest, the CJS require("react") inside react-dom
 * CJS can resolve to a different ESM module instance than the ESM import React
 * in test/component source files. React 19 stores the hooks dispatcher on
 * __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H
 * If react-dom uses a different object than the component's react import,
 * hooks see null as the dispatcher and throw "Invalid hook call".
 */
import React from "react"
import ReactDOM from "react-dom"

// biome-ignore lint/suspicious/noExplicitAny: React internals are untyped by design
const R = React as any
// biome-ignore lint/suspicious/noExplicitAny: ReactDOM internals are untyped by design
const RD = ReactDOM as any

const INTERNALS_KEY =
	"__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"

const testInternals = R[INTERNALS_KEY]
const domInternals = RD[INTERNALS_KEY]

if (testInternals && domInternals && testInternals !== domInternals) {
	// Copy all keys from the test file's React internals object onto the one
	// react-dom loaded (or vice versa — we just need them to be the same object).
	Object.assign(domInternals, testInternals)
	// Also replace the reference so future updates to testInternals propagate
	RD[INTERNALS_KEY] = testInternals
}
