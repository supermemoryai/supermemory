import { useState, useEffect } from "react";

function getViewport() {
  try {
    const { innerWidth: width, innerHeight: height } = window ?? {
      innerWidth: 0,
      innerHeight: 0,
    };
    return {
      width,
      height,
    };
  } catch {
    return {
      width: 0,
      height: 0,
    };
  }
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
