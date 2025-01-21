import { useEffect, useRef, useState } from "react";

interface UseAutoScrollOptions {
  offset?: number;
  bottomThreshold?: number;
}

export function useAutoScroll({ offset = 250, bottomThreshold = 10 }: UseAutoScrollOptions = {}) {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (bottomRef.current && shouldAutoScroll) {
      const parent = scrollRef.current;
      if (!parent) return;

      // Calculate the scroll position accounting for the offset
      const targetScrollTop = bottomRef.current.offsetTop - parent.clientHeight + offset;
      parent.scrollTo({ top: targetScrollTop, behavior });
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current || !bottomRef.current) return;

    const { scrollTop, clientHeight } = scrollRef.current;
    const targetScrollTop = bottomRef.current.offsetTop - clientHeight + offset;
    
    // Consider the user at the bottom if they're within the threshold of the target scroll position
    const isAtBottom = Math.abs(targetScrollTop - scrollTop) < bottomThreshold;

    if (shouldAutoScroll !== isAtBottom) {
      setShouldAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleTouchStart = () => {
      setShouldAutoScroll(false);
    };

    scrollElement.addEventListener("touchstart", handleTouchStart);
    scrollElement.addEventListener("scroll", handleScroll);

    return () => {
      scrollElement.removeEventListener("touchstart", handleTouchStart);
      scrollElement.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return {
    scrollRef,
    bottomRef,
    shouldAutoScroll,
    scrollToBottom,
    setShouldAutoScroll
  };
} 