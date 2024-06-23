import React, { useEffect } from "react";

export default function ContentApp() {
  const [text, setText] = React.useState("");
  const [hover, setHover] = React.useState(false);

  useEffect(() => {
    const messageListener = (message: any) => {
      setText(message);
      setTimeout(() => setText(""), 2000);
    };
    chrome.runtime.onMessage.addListener(messageListener);

    document.addEventListener('mousemove', (e)=> {
      const percentageX = (e.clientX / window.innerWidth) * 100;
      const percentageY = (e.clientY / window.innerHeight) * 100;

      if (percentageX > 75 && percentageY > 75){
        setHover(true)
      } else {
        setHover(false)
      }
    })
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  return (
    <div className="pointer-events-none flex justify-end items-end  h-screen w-full absolute z-99999">
      <div className="h-[30vh] bg-red-500 absolute flex justify-end items-center">
        <div
          className={`${hover && "opacity-100 "} transition bg-red-600 opacity-0 h-12 w-12 `}
        ></div>
      </div>

      <div
        className={`mx-4 my-2 flex flex-col gap-3 rounded-3xl bg-gray-900 text-xl py-4 px-6 overflow-hidden min-w-[20vw] min-h-24 max-w-96 max-h-40 ${text ? "translate-y-0 opacity-100" : "translate-y-[15%] opacity-0"} transition`}
      >
        <h2 className="text-2xl font-extrabold  text-white">Saved!</h2>
        <h2 className="text-lg font-medium text-white">{text}</h2>
      </div>
    </div>
  );
}