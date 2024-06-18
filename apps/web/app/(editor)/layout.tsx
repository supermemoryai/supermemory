import "./styles/prosemirror.css";
import "./styles/globals.css"
import type { ReactNode } from "react";


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
      <div className="dark">
        {children}
      </div>
  );
}
