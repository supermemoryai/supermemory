"use client"

import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

export type SmfsStatus = {
	tag: string
	state:
		| "external"
		| "mounted"
		| "degraded"
		| "unmounted"
		| "missing-binary"
		| "error"
	mountPath: string
	ownedByApp: boolean
	profileAvailable: boolean
	lastSync?: string | null
	binaryPath: string
	error?: string | null
}

export type SmfsStatusEvent = {
	statuses: SmfsStatus[]
	error?: string | null
}

export type SmfsProfile = {
	tag: string
	path: string
	content: string
}

export const SMFS_CONTAINER_TAG_PREFIX = "sm_fs_"
export const SMFS_STATUS_EVENT = "smfs:status"

export function getSmfsState() {
	return invoke<SmfsStatus[]>("smfs_state")
}

export function mountSmfs(tag?: string) {
	return invoke<SmfsStatus>("smfs_mount", { tag })
}

export function unmountSmfs(tag?: string) {
	return invoke<SmfsStatus>("smfs_unmount", { tag })
}

export function syncSmfs(tag?: string) {
	return invoke<SmfsStatus>("smfs_sync", { tag })
}

export function revealSmfs(tag?: string) {
	return invoke<void>("smfs_reveal", { tag })
}

export function getSmfsLogs(tag?: string, lines = 200) {
	return invoke<string>("smfs_logs", { tag, lines })
}

export function getDefaultSmfsContainerTag() {
	return invoke<string>("smfs_default_container_tag")
}

export function getSmfsProfile(tag?: string) {
	return invoke<SmfsProfile>("smfs_profile", { tag })
}

export function onSmfsStatus(handler: (event: SmfsStatusEvent) => void) {
	return listen<SmfsStatusEvent>(SMFS_STATUS_EVENT, (event) => {
		handler(event.payload)
	})
}
