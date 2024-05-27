"use server";

import { redirect } from "next/navigation";

export async function navigate(q: string) {
  redirect(`/chat?q=${q}`);
}
