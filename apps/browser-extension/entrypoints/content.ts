export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    let currentToast: HTMLElement | null = null;

    browser.runtime.onMessage.addListener(async (message) => {
      if (message.action === 'showToast') {
        showToast(message.state);
      } else if (message.action === 'saveMemory') {
        await saveMemory();
      }
    });

    async function saveMemory() {
      try {
        showToast('loading');

        const highlightedText = window.getSelection()?.toString() || '';

        const url = window.location.href;

        const html = document.documentElement.outerHTML;

        const response = await browser.runtime.sendMessage({
          action: 'saveMemory',
          data: {
            html,
            highlightedText,
            url,
          },
        });

        console.log('Response from enxtension:', response);
        if (response.success) {
          showToast('success');
        } else {
          showToast('error');
        }
      } catch (error) {
        console.error('Error saving memory:', error);
        showToast('error');
      }
    }

    function showToast(state: 'loading' | 'success' | 'error') {
      if (currentToast) {
        currentToast.remove();
      }

      const toast = document.createElement('div');
      toast.id = 'supermemory-toast';

      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        background: #ffffff;
        border-radius: 9999px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        color: #374151;
        min-width: 200px;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
      `;

      if (!document.getElementById('supermemory-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'supermemory-toast-styles';
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes fadeOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }

      const icon = document.createElement('div');
      icon.style.cssText = `
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      `;

      const text = document.createElement('span');
      text.style.cssText = `
        font-weight: 500;
      `;

      if (state === 'loading') {
        icon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6V2" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 22V18" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
            <path d="M20.49 8.51L18.36 6.38" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
            <path d="M5.64 17.64L3.51 15.51" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
            <path d="M22 12H18" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
            <path d="M6 12H2" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
            <path d="M20.49 15.49L18.36 17.62" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
            <path d="M5.64 6.36L3.51 8.49" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
          </svg>
        `;
        icon.style.animation = 'spin 1s linear infinite';
        if (!document.getElementById('supermemory-spinner-styles')) {
          const spinStyle = document.createElement('style');
          spinStyle.id = 'supermemory-spinner-styles';
          spinStyle.textContent = `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(spinStyle);
        }
        text.textContent = 'Adding to Memory...';
      } else if (state === 'success') {
        const iconUrl = browser.runtime.getURL('/icon-16.png');
        icon.innerHTML = `
          <img src="${iconUrl}" width="20" height="20" alt="Success" style="border-radius: 2px;" />
        `;
        text.textContent = 'Added to Memory';
      } else if (state === 'error') {
        icon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#ef4444"/>
            <path d="M15 9L9 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 9L15 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        text.textContent = 'Failed to save memory / Make sure you are logged in';
      }

      toast.appendChild(icon);
      toast.appendChild(text);
      document.body.appendChild(toast);
      currentToast = toast;

      if (state === 'success' || state === 'error') {
        setTimeout(() => {
          if (currentToast === toast) {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
              if (toast.parentNode) {
                toast.remove();
              }
              if (currentToast === toast) {
                currentToast = null;
              }
            }, 300);
          }
        }, 3000);
      }
    }

    document.addEventListener('keydown', async (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === 'm'
      ) {
        event.preventDefault();
        await saveMemory();
      }
    });

    window.addEventListener('message', (event) => {
      if (event.source !== window) {
        return;
      }
      const bearerToken = event.data.token;

      if (bearerToken) {
        if (
          !(
            window.location.hostname === 'localhost' ||
            window.location.hostname === 'supermemory.ai' ||
            window.location.hostname === 'app.supermemory.ai'
          )
        ) {
          console.log(
            'Bearer token is only allowed to be used on localhost or supermemory.ai'
          );
          return;
        }

        chrome.storage.local.set({ bearerToken }, () => {});
      }
    });
  },
});
