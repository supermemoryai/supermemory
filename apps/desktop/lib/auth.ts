"use client"

import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

export type AuthSession = {
	userId: string
	email?: string
	name?: string
	apiUrl: string
}

export const AUTH_CHANGED_EVENT = "auth:changed"
export const AUTH_ERROR_EVENT = "auth:error"

export type AuthChangedEvent = {
	authenticated: boolean
	apiUrl?: string | null
}

export async function getStoredToken() {
	return invoke<string | null>("auth_get_token")
}

export async function getSession() {
	return invoke<AuthSession>("auth_whoami")
}

export async function beginBrowserAuth() {
	return invoke<string>("auth_begin_browser")
}

export async function beginSocialAuth(provider: "google" | "github") {
	return invoke<string>("auth_begin_social", { provider })
}

export async function sendMagicLink(email: string) {
	return invoke("auth_send_magic_link", { email })
}

export async function verifyMagicLinkToken(token: string) {
	return invoke<string>("auth_verify_magic_link_token", { token })
}

export async function clearSession() {
	await invoke("auth_clear")
}

export function onAuthChanged(handler: (event: AuthChangedEvent) => void) {
	return listen<AuthChangedEvent>(AUTH_CHANGED_EVENT, (event) => {
		handler(event.payload)
	})
}

export function onAuthError(handler: (message: string) => void) {
	return listen<string>(AUTH_ERROR_EVENT, (event) => {
		handler(event.payload)
	})
}
