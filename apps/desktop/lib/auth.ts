"use client"

import { invoke } from "@tauri-apps/api/core"

export type AuthSession = {
	userId: string
	email?: string
	name?: string
	apiUrl: string
}

export const desktopDevAuthEnabled = process.env.NEXT_PUBLIC_DESKTOP_DEV === "1"

export async function getStoredToken() {
	return invoke<string | null>("auth_get_token")
}

export async function getSession() {
	return invoke<AuthSession>("auth_whoami")
}

export async function storeToken(token: string) {
	await invoke("auth_store_token", { token })
	return getSession()
}

export async function clearSession() {
	await invoke("auth_clear")
}
