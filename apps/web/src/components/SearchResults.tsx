"use client";

import React from "react";
import { Card, CardContent } from "./ui/card";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function SearchResults({
  aiResponse,
  sources,
}: {
  aiResponse: string;
  sources: string[];
}) {
  return (
    <div
      style={{
        backgroundImage: `linear-gradient(to right, #E5D9F2, #CDC1FF)`,
      }}
      className="mx-auto mt-4 w-full max-w-2xl space-y-6 rounded-xl border px-4 py-6"
    >
      <div className="text-start">
        <div className="text-xl text-black">
          <Markdown remarkPlugins={[remarkGfm]}>
            {aiResponse.replace("</s>", "")}
          </Markdown>
        </div>
      </div>
      <div className="grid gap-6">
        {sources.map((value, index) => (
          <Card key={index}>
            <CardContent className="space-y-2">{value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default SearchResults;
