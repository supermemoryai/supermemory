import Header from "./header";
import Menu from "./menu";
import { redirect } from "next/navigation";
import { auth } from "../../server/auth";
import { Toaster } from "@repo/ui/shadcn/sonner";

async function Layout({ children }: { children: React.ReactNode }) {
  const info = await auth();

  if (!info) {
    return redirect("/signin");
  }

  return (
    <main className="h-screen flex flex-col p-4 relative ">
      <Header />

      <Menu />

      {children}

      <Toaster />
    </main>
  );
}

export default Layout;
