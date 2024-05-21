import Image from "next/image";
import React from "react";
import EmailInput from "./EmailInput";

function Cta() {
  return (
    <section
      id="try"
      className="relative mb-44 mt-60 flex w-full flex-col items-center justify-center gap-8"
    >
      <div className="absolute left-0 z-[-1] h-full w-full">
        {/* a blue gradient line that's slightly tilted with blur (a lotof blur)*/}
        <div className="overflow-hidden">
          <div
            className="absolute left-[20%] top-[-165%] h-32 w-full overflow-hidden bg-[#369DFD] bg-opacity-70 blur-[337.4px]"
            style={{ transform: "rotate(-30deg)" }}
          />
        </div>
      </div>
      <Image
        src="/landing-ui-2.png"
        alt="Landing page background"
        width={1512}
        height={1405}
        priority
        draggable="false"
        className="absolute z-[-2] hidden select-none rounded-3xl bg-black md:block lg:w-[80%]"
      />
      <h1 className="z-20 mt-4 text-center text-5xl font-medium tracking-tight text-white">
        Your bookmarks are collecting dust.
      </h1>
      <div className="text-center text-sm text-zinc-500">
        Launching July 1st, 2024
      </div>
      <p className="text-soft-foreground-text z-20 text-center">
        Time to change that. <br /> Sign up for the waitlist and be the first to
        try Supermemory
      </p>
      <EmailInput />
    </section>
  );
}

export default Cta;
