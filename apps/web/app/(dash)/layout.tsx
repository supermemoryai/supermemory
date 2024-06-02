import React from "react";
import Header from "./header";
import Menu from "./menu";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-screen flex flex-col p-4 relative">
      <Header />

      <Menu />

      {children}
    </main>
  );
}

export default Layout;
