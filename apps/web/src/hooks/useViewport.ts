import { useState, useEffect } from "react";

function getViewport() {
  const { innerWidth: width, innerHeight: height } = window ?? {
    innerWidth: 0,
    innerHeight: 0,
  };
  return {
    width,
    height,
  };
}

export default function useViewport() {
  const [viewport, setViewport] = useState(getViewport());

  useEffect(() => {
    function handleResize() {
      setViewport(getViewport());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewport;
}
