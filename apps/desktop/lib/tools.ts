"use client"

import { invoke } from "@tauri-apps/api/core"

export type DesktopToolId = "claude-code" | "codex" | "cursor"

export type DesktopToolStatus = {
	id: DesktopToolId
	name: string
	detected: boolean
	connected: boolean
	configPath: string
	configExists: boolean
	detectedPath?: string | null
	version?: string | null
	installHint: string
	detail: string
}

export type DesktopToolPreview = {
	tool: DesktopToolStatus
	action: "connect" | "disconnect"
	configPath: string
	backupPath?: string | null
	diff: string
	before: string
	after: string
}

export type DesktopToolConnectResult = {
	tool: DesktopToolStatus
	backupPath?: string | null
}

export function detectDesktopTools() {
	return invoke<DesktopToolStatus[]>("tools_detect")
}

export function previewConnectDesktopTool(toolId: DesktopToolId) {
	return invoke<DesktopToolPreview>("tools_preview_connect", { toolId })
}

export function connectDesktopTool(toolId: DesktopToolId) {
	return invoke<DesktopToolConnectResult>("tools_connect", { toolId })
}

export function previewDisconnectDesktopTool(toolId: DesktopToolId) {
	return invoke<DesktopToolPreview>("tools_preview_disconnect", { toolId })
}

export function disconnectDesktopTool(toolId: DesktopToolId) {
	return invoke<DesktopToolConnectResult>("tools_disconnect", { toolId })
}
