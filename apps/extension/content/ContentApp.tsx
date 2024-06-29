import React, { useEffect, useState } from "react";
import icon from "../public/icon/icon_48.png";

export default function ContentApp() {
  const [text, setText] = useState("");
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const messageListener = (message: any) => {
      setText(message);
      setTimeout(() => setText(""), 2000);
    };
    chrome.runtime.onMessage.addListener(messageListener);

    document.addEventListener("mousemove", (e) => {
      const percentageX = (e.clientX / window.innerWidth) * 100;
      const percentageY = (e.clientY / window.innerHeight) * 100;

      if (percentageX > 75 && percentageY > 75) {
        setHover(true);
      } else {
        setHover(false);
      }
    });
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  return (
    <div className="flex justify-end items-end min-h-screen w-full">
      <button
        className={`${hover && "opacity-100 p-2 rounded-l-2xl"} transition bg-slate-700 border border-white/30 opacity-0 size-4 h-[30vh] absolute flex bottom-12 items-center`}
      >
        <img width={24} height={24} src={icon} alt="Save to supermemory.ai" />
      </button>
    </div>
  );
}
