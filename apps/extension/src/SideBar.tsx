import { useState } from 'react';
import { motion } from 'framer-motion';
import './ext.css';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';

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

function SideBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [savedWebsites, setSavedWebsites] = useState<string[]>([]);

  const [isSendingData, setIsSendingData] = useState(false);

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="anycontext-overlay"
        ></div>
      )}

      {isOpen ? (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3 }}
          className="anycontext-sidebar anycontext-relative"
        >
          <div className="anycontext-sidebar-content anycontext-text-black anycontext-px-4 anycontext-relative">
            <h1 className="anycontext-header">Ask a question to this page</h1>

            {/* Three buttons as options to choose from */}
            <div className="anycontext-flex anycontext-flex-col anycontext-gap-4 anycontext-mt-8 anycontext-px-4">
              <Button className="anycontext-w-full">Summarize content</Button>
              <Button className="anycontext-w-full">
                What's the most important?
              </Button>
              <Button className="anycontext-w-full anycontext-bg-gradient-to-tr anycontext-from-purple-400 anycontext-to-purple-600">
                Save to memory
              </Button>
            </div>

            <div className="anycontext-flex anycontext-absolute anycontext-bottom-0 anycontext-w-full anycontext-gap-4 anycontext-justify-between anycontext-px-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about this website"
                className="anycontext-mb-4 anycontext-text-black anycontext-outline"
              />
              <Button>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-send-horizontal"
                >
                  <path d="m3 3 3 9-3 9 19-9Z" />
                  <path d="M6 12h16" />
                </svg>
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="anycontext-flex anycontext-flex-col anycontext-gap-2 anycontext-fixed anycontext-bottom-12 anycontext-right-0 anycontext-z-[99999]">
          <button
            onClick={() => setIsOpen(true)}
            className="anycontext-open-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-panel-right-open"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M15 3v18" />
              <path d="m10 15-3-3 3-3" />
            </svg>
          </button>

          <button
            onClick={() => {
              sendUrlToAPI();
              setIsSendingData(true);
              setTimeout(() => {
                setIsSendingData(false);
                setSavedWebsites([...savedWebsites, window.location.href]);
              }, 1000);
            }}
            className="anycontext-open-button"
          >
            {savedWebsites.includes(window.location.href) ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-file-check-2"
              >
                <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="m3 15 2 2 4-4" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-5 h-5 ${isSendingData ? 'anycontext-animate-spin' : ''}`}
              >
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </>
  );
}

export default SideBar;
