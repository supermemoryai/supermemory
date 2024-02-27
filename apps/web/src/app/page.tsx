import Image from "next/image";
import MessagePoster from "./MessagePoster";
import { cookies } from "next/headers";
import { Component } from "@/components/component";

export const runtime = 'edge';

export default function Home() {
  return (
    <main>
      <MessagePoster jwt={cookies().get('next-auth.session-token')?.value!} />
      <Component/>
    </main>
  );
}
