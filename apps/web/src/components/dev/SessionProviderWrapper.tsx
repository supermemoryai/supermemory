import { SessionProvider } from "next-auth/react";
import React from "react";

function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") {
    return <>{children}</>;
  } else {
    return <SessionProvider>{children}</SessionProvider>;
  }
}

export default SessionProviderWrapper;
