import React, { useEffect } from "react";
import tailwindBg from "../public/tailwind_bg.png";

export default function ContentApp() {
  const [text, setText] = React.useState("");

  useEffect(() => {
    const messageListener = (message: any) => {
      setText(message);
      setTimeout(() => setText(""), 2000);
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none ${text ? "opacity-100" : "opacity-0"} transition mx-auto max-w-7xl md:px-0 lg:px-6 lg:py-2`}
    >
      <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-4 shadow-2xl lg:rounded-3xl md:pt-24 md:h-full sm:h-[100vh] lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
        <div className="absolute z-20 top-0 inset-x-0 flex justify-center overflow-hidden pointer-events-none">
          <div className="w-[108rem] flex-none flex justify-end">
            <picture>
              <img
                src={tailwindBg}
                alt=""
                className="w-[90rem] flex-none max-w-none hidden dark:block"
                decoding="async"
              />
            </picture>
          </div>
        </div>
        <div className="mx-auto max-w-md text-center lg:py-12 lg:mx-0 lg:flex-auto lg:text-left">
          <div className="flex items-center justify-center space-x-4 my-4 mx-auto"></div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Saved: {text}
          </h2>
        </div>
      </div>
    </div>
  );
}
