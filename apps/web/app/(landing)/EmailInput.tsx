"use client";

import { FormEvent, useState } from "react";
import formSubmitAction from "./formSubmitAction";
import { useToast } from "@repo/ui/shadcn/use-toast";

function EmailInput() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const value = await formSubmitAction(email, "token" as string);

        if (value.success) {
          setEmail("");
          toast({
            title: "You are now on the waitlist! 🎉",
            description:
              "We will notify you when we launch. Check your inbox and spam folder for a surprise! 🎁",
          });
        } else {
          console.error("email submission failed: ", value.value);
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: `${value.value}`,
          });
        }
      }}
      className="flex w-full items-center justify-center gap-2"
    >
      <div
        className={`transition-width z-20 rounded-2xl bg-gradient-to-br from-gray-200/70 to-transparent p-[0.7px] duration-300 ease-in-out ${email ? "w-[90%] md:w-[42%]" : "w-full md:w-1/2"}`}
      >
        <input
          type="email"
          name="email"
          className={`transition-width flex w-full items-center rounded-2xl bg-[#37485E] px-4 py-2 outline-none duration-300 focus:outline-none`}
          placeholder="Enter your email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div
        className="cf-turnstile"
        data-sitekey="0x4AAAAAAAakohhUeXc99J7E"
      ></div>
      {email && (
        <button
          type="submit"
          className="transition-width rounded-xl bg-gray-700 p-2 text-white duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
            />
          </svg>
        </button>
      )}
    </form>
  );
}

export default EmailInput;
