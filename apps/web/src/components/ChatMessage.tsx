import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { User } from "next-auth";
import { User2 } from "lucide-react";
import Image from "next/image";

export function ChatAnswer({
  children: message,
  sources,
}: {
  children: string;
  sources?: string[];
}) {
  return <div className="mt-5 w-full text-lg">{message}</div>;
}

export function ChatQuestion({ children }: { children: string }) {
  return (
    <div
      className={`text-rgray-12 w-full text-left ${children.length > 200 ? "text-xl" : "text-2xl"} font-light`}
    >
      {children}
    </div>
  );
}
