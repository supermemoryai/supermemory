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

    chrome.storage.local.set({ jwt }, () => {
      console.log('JWT saved to local storage', jwt);
    });
  }
});
// Run when the URL changes, including hash changes
window.onpopstate = sendUrlToAPI;

// Also run when the page loads
sendUrlToAPI();

function sendUrlToAPI() {
  // get the current URL
  const url = window.location.href;

  const blacklist = ['localhost:3000', 'anycontext.dhr.wtf'];
  // check if the URL is blacklisted
  if (blacklist.some((blacklisted) => url.includes(blacklisted))) {
    console.log('URL is blacklisted');
    return;
  } else {
    // const content = Entire page content, but cleaned up for the LLM. No ads, no scripts, no styles, just the text. if article, just the importnat info abou tit.
    const content = document.documentElement.innerText;
    chrome.runtime.sendMessage({ type: 'urlChange', content, url });
  }
}