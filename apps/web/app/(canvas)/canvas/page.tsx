import { redirect } from "next/navigation";
import React from "react";

function page() {
  redirect("/signin");
  return <div>page</div>;
}

export default page;
