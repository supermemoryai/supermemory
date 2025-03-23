import { defineExtensionMessaging } from "@webext-core/messaging"

// TODO: Remove anys
interface ProtocolMap {
    savePage(payload: {
        html?: string
        url?: string
        spaces?: string[]
        description?: string | null
        prefetched?: {
            contentToVectorize?: string | null
            contentToSave?: string | null
            title?: string | null
            type?: string | null
        }
    }): { success?: boolean; data?: any; status?: number; error?: string }

    getSpaces(): any
    exportTwitterBookmarks(): { status: string }
    syncChromeBookmarks(): void
    importChromeBookmarks(): { success: true } | void
}

export const { sendMessage, onMessage } =
    defineExtensionMessaging<ProtocolMap>()
