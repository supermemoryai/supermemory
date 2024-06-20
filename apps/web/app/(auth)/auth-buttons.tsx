"use client";

import { Button } from "@repo/ui/shadcn/button";
import React from "react";
import { signIn } from "../../server/auth";

function SignIn() {
  return (
    <Button className="mt-4" onClick={async () => await signIn("google")}>
      Login with Google
    </Button>
  );
}

export default SignIn;
