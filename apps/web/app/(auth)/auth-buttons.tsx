"use client";

import { Button } from "@repo/ui/src/button";
import React from "react";
import { signIn } from "../helpers/server/auth";

function SignIn() {
  return (
    <Button className="mt-4" onClick={async () => await signIn("google")}>
      Login with Google
    </Button>
  );
}

export default SignIn;
