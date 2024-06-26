import React from "react";

export default function ContentApp() {
  const [text, setText] = React.useState("");
  const [hover, setHover] = React.useState(false);

  const messageListener = (message: any) => {
    setText(message);
    setTimeout(() => setText(""), 2000);
  };

  React.useEffect(() => {
    chrome.runtime.onMessage.addListener(messageListener);

    document.addEventListener("mousemove", (e) => {
      const percentageX = (e.clientX / window.innerWidth) * 100;
      const percentageY = (e.clientY / window.innerHeight) * 100;

      if (percentageX > 66 && percentageY > 66) {
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
    <div className="pointer-events-none h-screen w-full fixed left-0 top-0 flex items-end justify-end">
      <div className="h-[33vh] w-[33vw] absolute flex justify-end items-center px-4">
        <div
          className={`${hover && !text && "opacity-100"} transition-all rounded-full bg-red-600 opacity-0 h-12 w-12 `}
        ></div>
        {text && (
          <div
            className={`mx-4 my-2 flex flex-col gap-3 rounded-3xl bg-gray-900 text-xl py-4 px-6 overflow-hidden min-w-[20vw] min-h-24 max-w-96 max-h-40 ${text ? "translate-y-0 opacity-100" : "translate-y-[15%] opacity-0"} transition`}
          >
            <h2 className="text-2xl font-extrabold  text-white">Saved!</h2>
            <h2 className="text-lg font-medium text-white">{text}</h2>
          </div>
        )}
      </div>
    </div>
  );
}
