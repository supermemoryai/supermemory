"use client";

import React, { useEffect, useState } from "react";
import QueryInput from "./queryinput";
import { homeSearchParamsCache } from "@/lib/searchParams";
import { getSpaces } from "@/app/actions/fetchers";
import { useRouter } from "next/navigation";

function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // TODO: use this to show a welcome page/modal
  const { firstTime } = homeSearchParamsCache.parse(searchParams);

  const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    getSpaces().then((res) => {
      if (res.success && res.data) {
        setSpaces(res.data);
      }
      // TODO: HANDLE ERROR
    });
  }, []);

  const { push } = useRouter();

  return (
    <div className="max-w-3xl h-full justify-center flex mx-auto w-full flex-col">
      {/* all content goes here */}
      {/* <div className="">hi {firstTime ? 'first time' : ''}</div> */}

      <div className="w-full pb-20">
        <QueryInput
          handleSubmit={(q, spaces) => {
            const newQ =
              "/chat?q=" +
              encodeURI(q) +
              (spaces ? "&spaces=" + JSON.stringify(spaces) : "");

            push(newQ);
          }}
          initialSpaces={spaces}
        />
      </div>
    </div>
  );
}

export default Page;
