import Header from "./header";
import Menu from "./menu";
import { redirect } from "next/navigation";
import { auth } from "../helpers/server/auth";
import { Toaster } from "@repo/ui/shadcn/sonner";

async function Layout({ children }: { children: React.ReactNode }) {
  const info = await auth();

  if (!info) {
    return redirect("/signin");
  }

  return (
    <main className="h-screen flex flex-col">

      <div className="fixed top-0 left-0 w-full">
        <Header />
      </div>

      <Menu />

      <div className="w-full h-full">
        {children}
      </div>

      <Toaster />
    </main>
  );
}

export default Layout;
