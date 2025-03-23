import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
    extensionApi: "chrome",
    modules: ["@wxt-dev/module-react"],
    dev: {
        server: {
            port: 3001,
        },
    },
    vite: () => ({
        plugins: [tailwindcss()],
    }),
    runner: {
        openConsole: true,
        startUrls: ["http://localhost:3000", "https://supermemory.ai"],
        chromiumArgs: ["--user-data-dir=./.wxt/chrome-data"],
    },
    manifest: {
        name: "Supermemory",
        homepage_url: "https://supermemory.ai",
        permissions: [
            "activeTab",
            "scripting",
            "tabs",
            "management",
            "webRequest",
            "storage",
            "bookmarks",
        ],
        action: {},
        host_permissions: ["*://*/*"],
        externally_connectable: {
            matches: [
                "http://localhost:3000/*",
                "https://supermemory.ai/*",
                "https://beta.supermemory.ai/*",
                "http://supermemory.com/*",
            ],
        },
        key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjXw4pdl6EOYXSdpf0ZIbe1yHegH/lzpuda1RsOxzGoZaijnVZ7SDdaQjnb52sNRIgevk9VVWHNmzhKkxKJ5E+un6vH0Rl4eF8WrpHyZg3oCH7svT3cldRnUevMG05EdRLSlzh2L49G6XopHUEkpXXgK/1heLf6wqNPdMHtM2Aayv2K8+S2A0+IgibKclxETZRF9LXkdRblfSvU7/qhHSJOeHj1C2LNs5jQUCHbTi00hWyqrCwVn+Wv60OrZzEiMfmZJsE9oGnit2sA/hI6bMATYWjxkSbTfWskNRK4veWe5mqn0uCxt+YskRAhfRJiYUR3WVOw/WWe5i1R3LGnPmywIDAQAB",
    },
});
