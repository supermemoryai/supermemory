import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['contextMenus', 'storage', 'scripting', 'activeTab'],
    web_accessible_resources: [
      {
        resources: ['icon-16.png'],
        matches: ['<all_urls>']
      }
    ],
  },
  webExt: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
});
