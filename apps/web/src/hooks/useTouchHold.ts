import { useState } from "react";

// holdDuration (in ms)
const useTouchHold = ({
  onHold,
  holdDuration = 500,
}: {
  holdDuration?: number;
  onHold: () => Promise<void> | void;
}) => {
  const [touchTimeout, setTouchTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  return {
    onTouchStart: () => {
      setTouchTimeout(setTimeout(onHold, holdDuration));
    },
    onTouchEnd: () => {
      if (touchTimeout) {
        clearTimeout(touchTimeout);
      }
    },
  };
};

export default useTouchHold;
