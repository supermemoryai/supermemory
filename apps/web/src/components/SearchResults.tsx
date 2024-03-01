'use client'

import React from 'react';
import { Card, CardContent } from './ui/card';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm'

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
      className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 border mt-4 rounded-xl"
    >
      <div className="text-start">
        <div className="text-xl text-black">
          <Markdown remarkPlugins={[remarkGfm]}>{aiResponse.replace('</s>', '')}</Markdown>
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
