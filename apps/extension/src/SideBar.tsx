import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './dist.css';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip';

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

function SideBar({ jwt }: { jwt: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [savedWebsites, setSavedWebsites] = useState<string[]>([]);

  const [isSendingData, setIsSendingData] = useState(false);

  const [toBeParsed, setToBeParsed] = useState('');
  const [aiResponse, setAIResponse] = useState<string>('');
  const [lastQuestion, setLastQuestion] = useState<string>('');

  const handleStreamData = (newChunk: string) => {
    // Append the new chunk to the existing data to be parsed
    setToBeParsed((prev) => prev + newChunk);
  };

  const queryApi = async () => {
    const content = document.documentElement.innerText;

    setAIResponse('');

    const query = `Answer this question based on this query: ${input}\n\n${content}`;

    chrome.runtime.sendMessage({ type: 'queryApi', input: query, jwt });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'streamData') {
        console.log(message.data);
        handleStreamData(message.data);
      } else if (message.action === 'streamEnd') {
        setLastQuestion(input);
        setInput('');
        setToBeParsed('');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Define a function to try parsing the accumulated data
    const tryParseAccumulatedData = () => {
      // Attempt to parse the "toBeParsed" state as JSON
      try {
        // Split the accumulated data by the known delimiter "\n\n"
        const parts = toBeParsed.split('\n\n');
        let remainingData = '';

        // Process each part to extract JSON objects
        parts.forEach((part, index) => {
          if (part.startsWith('data: [DONE]data: ')) {
            part = part.replace('data: [DONE]data: ', 'data: ');
          }
          try {
            const parsedPart = JSON.parse(part.replace('data: ', '')); // Try to parse the part as JSON

            // If the part is the last one and couldn't be parsed, keep it to  accumulate more data
            if (index === parts.length - 1 && !parsedPart) {
              remainingData = part;
            } else if (parsedPart && parsedPart.response) {
              // If the part is parsable and has the "response" field, update the AI response state
              setAIResponse((prev) => prev + parsedPart.response);
            }
          } catch (error) {
            // If parsing fails and it's not the last part, it's a malformed JSON
            if (index !== parts.length - 1) {
              console.error('Malformed JSON part: ', part);
            } else {
              // If it's the last part, it may be incomplete, so keep it
              remainingData = part;
            }
          }
        });

        // Update the toBeParsed state to only contain the unparsed remainder
        if (remainingData !== toBeParsed) {
          setToBeParsed(remainingData);
        }
      } catch (error) {
        console.error('Error parsing accumulated data: ', error);
      }
    };

    // Call the parsing function if there's data to be parsed
    if (toBeParsed) {
      tryParseAccumulatedData();
    }
  }, [toBeParsed]);

  return (
    <>
      <TooltipProvider>
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
              <h1 className="anycontext-header anycontext-font-sans">
                Ask a question to this page
              </h1>

              {/* Three buttons as options to choose from */}
              {!input && (
                <div className="anycontext-flex anycontext-flex-col anycontext-gap-4 anycontext-mt-8 anycontext-px-4">
                  <Button
                    onClick={async () => {
                      setInput('Summarise the content of this web page');
                      await queryApi();
                    }}
                    className="anycontext-w-full"
                  >
                    Summarize content
                  </Button>
                  <Button
                    onClick={async () => {
                      setInput(
                        'Whats the most important points of this page? Answer in points.',
                      );
                      await queryApi();
                    }}
                    className="anycontext-w-full"
                  >
                    What's the most important?
                  </Button>
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      sendUrlToAPI();
                      setIsSendingData(true);
                      setTimeout(() => {
                        setIsSendingData(false);
                        setSavedWebsites([
                          ...savedWebsites,
                          window.location.href,
                        ]);
                      }, 1000);
                    }}
                    className="anycontext-w-full anycontext-bg-gradient-to-tr anycontext-from-purple-400 anycontext-to-purple-600"
                  >
                    Save to memory
                  </Button>
                </div>
              )}

              {lastQuestion && (
                <div className="anycontext-mb-4">
                  <h2 className="anycontext-text-lg anycontext-font-semibold">
                    {lastQuestion}
                  </h2>
                </div>
              )}
              <div className="anycontext-px-4 anycontext-max-h-[75vh] anycontext-overflow-y-auto anycontext-mt-8">
                {aiResponse.replace('</s>', '')}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await queryApi();
                  setInput('');
                }}
                className="anycontext-flex anycontext-absolute anycontext-bottom-0 anycontext-w-full anycontext-gap-4 anycontext-justify-between anycontext-px-4"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about this website"
                  className="anycontext-mb-4 anycontext-text-black anycontext-outline"
                />
                <Button onClick={async () => queryApi()}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-send-horizontal"
                  >
                    <path d="m3 3 3 9-3 9 19-9Z" />
                    <path d="M6 12h16" />
                  </svg>
                </Button>
              </form>
            </div>
          </motion.div>
        ) : (
          <div className="anycontext-flex anycontext-flex-col anycontext-gap-2 anycontext-fixed anycontext-bottom-12 anycontext-right-0 anycontext-z-[99999]">
            <Tooltip delayDuration={300}>
              <TooltipTrigger>
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
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-panel-right-open"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M15 3v18" />
                    <path d="m10 15-3-3 3-3" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Open Sidebar</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
              <TooltipTrigger>
                <button
                  onClick={() => {
                    sendUrlToAPI();
                    setIsSendingData(true);
                    setTimeout(() => {
                      setIsSendingData(false);
                      setSavedWebsites([
                        ...savedWebsites,
                        window.location.href,
                      ]);
                    }, 1000);
                  }}
                  disabled={savedWebsites.includes(window.location.href)}
                  className="anycontext-open-button disabled:anycontext-opacity-30"
                >
                  {savedWebsites.includes(window.location.href) ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
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
                      className={`anycontext-w-5 anycontext-h-5 ${isSendingData ? 'anycontext-animate-spin' : ''}`}
                    >
                      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684ZM13.949 13.684a1 1 0 0 0-1.898 0l-.184.551a1 1 0 0 1-.632.633l-.551.183a1 1 0 0 0 0 1.898l.551.183a1 1 0 0 1 .633.633l.183.551a1 1 0 0 0 1.898 0l.184-.551a1 1 0 0 1 .632-.633l.551-.183a1 1 0 0 0 0-1.898l-.551-.184a1 1 0 0 1-.633-.632l-.183-.551Z" />
                    </svg>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>
                  {savedWebsites.includes(window.location.href)
                    ? 'Added to memory'
                    : 'Add to memory'}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </TooltipProvider>
    </>
  );
}

export default SideBar;
