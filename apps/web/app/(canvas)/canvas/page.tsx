import { useRouter } from "next/router";
import React from "react";

function page() {
  const router = useRouter();
  router.push("/home");
  return <div>page</div>;
}

export default page;
