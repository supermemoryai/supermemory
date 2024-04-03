'use client';

import { Label } from './ui/label';
import React, { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import SearchResults from './SearchResults';

function QueryAI() {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [aiResponse, setAIResponse] = useState('');
  const [input, setInput] = useState('');
  const [toBeParsed, setToBeParsed] = useState('');

  const handleStreamData = (newChunk: string) => {
    // Append the new chunk to the existing data to be parsed
    setToBeParsed((prev) => prev + newChunk);
  };

  useEffect(() => {
    // Define a function to try parsing the accumulated data
    const tryParseAccumulatedData = () => {
      // Attempt to parse the "toBeParsed" state as JSON
      try {
        // Split the accumulated data by the known delimiter "\n\n"
        const parts = toBeParsed.split('\n\n');
        let remainingData = '';

        // Process each part to extract JSON objects
        parts.forEach((part, index) => {
          try {
            const parsedPart = JSON.parse(part.replace('data: ', '')); // Try to parse the part as JSON

            // If the part is the last one and couldn't be parsed, keep it to  accumulate more data
            if (index === parts.length - 1 && !parsedPart) {
              remainingData = part;
            } else if (parsedPart && parsedPart.response) {
              // If the part is parsable and has the "response" field, update the AI response state
              setAIResponse((prev) => prev + parsedPart.response);
            }
          } catch (error) {
            // If parsing fails and it's not the last part, it's a malformed JSON
            if (index !== parts.length - 1) {
              console.error('Malformed JSON part: ', part);
            } else {
              // If it's the last part, it may be incomplete, so keep it
              remainingData = part;
            }
          }
        });

        // Update the toBeParsed state to only contain the unparsed remainder
        if (remainingData !== toBeParsed) {
          setToBeParsed(remainingData);
        }
      } catch (error) {
        console.error('Error parsing accumulated data: ', error);
      }
    };

    // Call the parsing function if there's data to be parsed
    if (toBeParsed) {
      tryParseAccumulatedData();
    }
  }, [toBeParsed]);

  const getSearchResults = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAiLoading(true);

    const sourcesResponse = await fetch(
      `/api/query?sourcesOnly=true&q=${input}`,
    );

    const sourcesInJson = (await sourcesResponse.json()) as {
      ids: string[];
    };

    setSearchResults(sourcesInJson.ids);

    const response = await fetch(`/api/query?q=${input}`);

    if (response.status !== 200) {
      setIsAiLoading(false);
      return;
    }

    if (response.body) {
      let reader = response.body.getReader();
      let decoder = new TextDecoder('utf-8');
      let result = '';

      // @ts-ignore
      reader.read().then(function processText({ done, value }) {
        if (done) {
          //   setSearchResults(JSON.parse(result.replace('data: ', '')));
          //   setIsAiLoading(false);
          return;
        }

        handleStreamData(decoder.decode(value));

        return reader.read().then(processText);
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={async (e) => await getSearchResults(e)} className="mt-8">
        <Label htmlFor="searchInput">Ask your SuperMemory</Label>
        <div className="flex flex-col md:flex-row md:w-full md:items-center space-y-2 md:space-y-0 md:space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search using AI... ✨"
            id="searchInput"
          />
          <Button
            disabled={isAiLoading}
            className="max-w-min md:w-full"
            type="submit"
            variant="default"
          >
            Ask AI
          </Button>
        </div>
      </form>

      {searchResults && (
        <SearchResults aiResponse={aiResponse} sources={searchResults} />
      )}
    </div>
  );
}

export default QueryAI;
