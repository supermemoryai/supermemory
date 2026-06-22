"use client"

import { invoke } from "@tauri-apps/api/core"

export type SpotlightMemory = {
	id: string
	title: string | null
	summary?: string | null
	content?: string | null
	raw?: string | null
	url?: string | null
	type?: string | null
	createdAt: string
}

export const OPEN_MEMORY_EVENT = "nav:open-memory"
export const SPOTLIGHT_SHOWN_EVENT = "spotlight:shown"

export function showSpotlight() {
	return invoke("spotlight_show")
}

export function hideSpotlight() {
	return invoke("spotlight_hide")
}

export function openSpotlightResult(memory: SpotlightMemory) {
	return invoke("spotlight_open_result", { memory })
}
