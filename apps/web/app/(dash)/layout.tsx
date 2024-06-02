import Header from "./header";
import Menu from "./menu";
import { ensureAuth } from "./actions";
import { redirect } from "next/navigation";

async function Layout({ children }: { children: React.ReactNode }) {
  const info = await ensureAuth();

  if (!info) {
    return redirect("/signin");
  }

  return (
    <main className="h-screen flex flex-col p-4 relative">
      <Header />

      <Menu />

      {children}
    </main>
  );
}

export default Layout;
