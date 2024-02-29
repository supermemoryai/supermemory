window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }
  const { jwt } = event.data;

  if (jwt) {
    if (
      !(
        window.location.hostname === 'localhost' ||
        window.location.hostname === 'anycontext.dhr.wtf'
      )
    ) {
      console.log(
        'JWT is only allowed to be used on localhost or anycontext.dhr.wtf',
      );
      return;
    }

    chrome.storage.local.set({ jwt }, () => {});
  }
});

const appContainer = document.createElement('div');
appContainer.id = 'anycontext-app-container';

// First in the body, above the content
document.body.insertBefore(appContainer, document.body.firstChild);

appContainer.style.zIndex = '9999';

import ReactDOM from 'react-dom/client';
import SideBar from './SideBar';

ReactDOM.createRoot(
  document.getElementById('anycontext-app-container')!,
).render(<SideBar />);
