import { getBaseURL } from "@/utils"
import { onMessage } from "@/utils/helpers"
import {
    handleExportXBookmarks,
    setupTwitterHeaderListener,
} from "../utils/twitter"

type TabState = {
    isActive: boolean
}

export default defineBackground(() => {
    const tabStates = new Map<number, TabState>()

    const checkIfLoggedIn = async () => {
        const baseURL = await getBaseURL()
        const response = await fetch(`${baseURL}/backend/v1/session`)

        return response.status == 200
    }

    // When extension is installed
    chrome.runtime.onInstalled.addListener(async (details) => {
        const isLoggedIn = await checkIfLoggedIn()

        const baseURL = await getBaseURL()
        if (!isLoggedIn) {
            chrome.tabs.create({ url: `${baseURL}/signin` })
        }

        // TODO: show extension help page
    })

    // Clean up tab state when tab is closed
    chrome.tabs.onRemoved.addListener((tabId) => {
        tabStates.delete(tabId)
    })

    // communication with content script
    chrome.action.onClicked.addListener(async (tab) => {
        if (!tab.id) return

        try {
            // Check if we can inject into this tab
            if (
                !tab.url ||
                tab.url.startsWith("chrome://") ||
                tab.url.startsWith("edge://") ||
                tab.url.startsWith("about:")
            ) {
                alert("Cannot modify Chrome system pages")
                return
            }

            const baseURL = await getBaseURL()

            const isLoggedIn = await checkIfLoggedIn()
            if (!isLoggedIn) {
                chrome.tabs.create({ url: `${baseURL}/signin` })
                return
            }

            const currentState = tabStates.get(tab.id) || { isActive: false }
            const newState = { isActive: !currentState.isActive }

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content-scripts/content.js"],
            })

            // Update state
            tabStates.set(tab.id, newState)

            // Update icon title
            await chrome.action.setTitle({
                tabId: tab.id,
                title: newState.isActive
                    ? "Disable SuperMemory"
                    : "Enable SuperMemory",
            })
        } catch (error) {
            console.error("Failed to toggle content:", error)
        }
    })

    onMessage("getSpaces", async (message) => {
        // Handle getting spaces
        const baseURL = await getBaseURL()
        const response = await fetch(`${baseURL}/backend/v1/spaces`)
        const data = await response.json()
        return data
    })

    onMessage("exportTwitterBookmarks", async (message) => {
        handleExportXBookmarks()
        return { status: "started" }
    })

    onMessage("savePage", async (message) => {
        if (!message.data) {
            return { error: "No payload" }
        }

        const baseURL = await getBaseURL()

        const isLoggedIn = await checkIfLoggedIn()
        if (!isLoggedIn) {
            chrome.tabs.create({ url: `${baseURL}/signin` })
            return { error: "Not logged in" }
        }

        console.log(message)

        const response = await fetch(`${baseURL}/backend/v1/add`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                spaces: message.data.spaces || [],
                content: message.data.url,
                prefetched: message.data.prefetched,
            }),
        })
        if (response.status !== 200) {
            return {
                error: "Failed to save page",
                status: response.status,
            }
        }
        const data = await response.json()
        // Handle saving highlight
        return { success: true, data, status: response.status }
    })

    onMessage("syncChromeBookmarks", async (message) => {
        // activate the chrome bookmarks syncing.

        // TODO: We probably want to sync bookmarks from the extension to the web app.
        chrome.bookmarks.onCreated.addListener((id, bookmark) => {
            console.log("Bookmark created:", bookmark)
        })
    })

    onMessage("importChromeBookmarks", async (message) => {
        // activate the chrome bookmarks importing.
        // first get all chrome bookmarks
        chrome.bookmarks.getRecent(100, (bookmarks) => {
            console.log("Bookmarks:", bookmarks)
        })
    })

    // External message listener
    chrome.runtime.onMessageExternal.addListener(
        async (request, sender, sendResponse) => {
            if (request.action === "exportBookmarks") {
                handleExportXBookmarks()
                sendResponse({ status: "exported" })
                return true
            }
            if (request.action === "importBookmarks") {
                const baseURL = await getBaseURL()
                chrome.bookmarks.getRecent(100, async (bookmarks) => {
                    for (const { url } of bookmarks) {
                        console.log("Importing bookmark:", url)
                        const r = await fetch(`${baseURL}/backend/v1/add`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ content: url, spaces: [] }),
                        })

                        const response = await r.json()
                        console.log("Response:", response)
                    }
                    sendResponse({ status: "imported", bookmarks })
                })
                return true
            }
            if (request.action === "ping") {
                sendResponse({ status: "pong" })
                return true
            }
        },
    )

    setupTwitterHeaderListener()
})
