import React from "react";

function EmailInput() {
  return (
    <div className="z-20 w-full rounded-2xl bg-gradient-to-br from-gray-200/70 to-transparent p-[0.7px] md:w-1/2">
      <input
        type="email"
        className="flex w-full items-center rounded-2xl bg-[#37485E] px-4 py-2 focus:outline-none"
        placeholder="Enter your email"
        autoFocus
      />
    </div>
  );
}

export default EmailInput;
