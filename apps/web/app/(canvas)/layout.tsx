import { auth } from "@/server/auth";
import "./canvasStyles.css";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const info = await auth();

  if (!info) {
    return redirect("/signin");
  }
  return (
      <div>{children}</div>
  );
}
