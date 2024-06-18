"use client";

import {
  AnimatePresence,
  useMotionValueEvent,
  useScroll,
  motion,
} from "framer-motion";
import React, { useState } from "react";

function Topbar({
  charsCount,
  saveStatus,
}: {
  charsCount: number | undefined;
  saveStatus: string;
}) {
  const [visible, setVisible] = useState(true);

  const { scrollYProgress } = useScroll();
  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      let direction = current! - scrollYProgress.getPrevious()!;

      if (direction < 0 || direction === 1) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    }
  });
  return (
    <div className="fixed left-0 top-0 z-10">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{
            opacity: 1,
            y: -150,
          }}
          animate={{
            y: visible ? 0 : -150,
            opacity: visible ? 1 : 0,
          }}
          transition={{
            duration: 0.2,
          }}
          className="flex flex-col items-center"
        >
          <div className="gap-2 w-screen flex bg-[#171B1F] justify-center items-center pt-6 pb-4">
            <div className="rounded-lg bg-[#21303D] px-2 py-1 text-sm text-muted-foreground">
              Untitled
            </div>
            <div className="rounded-lg bg-[#21303D] px-2 py-1 text-sm text-muted-foreground">
              {saveStatus}
            </div>
            {charsCount && (
              <div className="rounded-lg bg-[#21303D] px-2 py-1 text-sm text-muted-foreground">
                {`${charsCount} words`}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default Topbar;
