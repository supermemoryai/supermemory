import React from "react";
import Markdown from "react-markdown";
import { policy } from "./privacy";

export const runtime = "edge";

function Page() {
  return (
    <div>
      <Markdown>{policy}</Markdown>
    </div>
  );
}

export default Page;
