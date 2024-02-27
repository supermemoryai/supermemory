import Image from "next/image";
import MessagePoster from "./MessagePoster";
import { cookies } from "next/headers";
import { Component } from "@/components/component";

export const runtime = 'edge';

export default function Home() {
  const token = cookies().get('next-auth.session-token')?.value ?? cookies().get("__Secure-authjs.session-token")?.value ?? cookies().get("authjs.session-token")?.value
  return (
    <main>
      {token && <MessagePoster jwt={token} />}
      <Component/>
    </main>
  );
}
