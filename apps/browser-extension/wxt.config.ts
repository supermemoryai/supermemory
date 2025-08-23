import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Supermemory',
    homepage_url: 'https://supermemory.ai',
    permissions: [
      'contextMenus',
      'storage',
      'scripting',
      'activeTab',
      'webRequest',
      'tabs',
    ],
    host_permissions: [
      '*://x.com/*',
      '*://twitter.com/*',
      '*://supermemory.ai/*',
      '*://api.supermemory.ai/*',
      '*://chatgpt.com/*',
      '*://chat.openai.com/*',
    ],
    web_accessible_resources: [
      {
        resources: ['icon-16.png', 'light-mode-icon.png', 'dark-mode-icon.png'],
        matches: ['<all_urls>'],
      },
    ],
  },
  webExt: {
    disabled: true,
  },
});
