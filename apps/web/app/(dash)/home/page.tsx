import React from "react";
import Menu from "../menu";
import Header from "../header";
import QueryInput from "./queryinput";
import { homeSearchParamsCache } from "@/app/helpers/lib/searchParams";
import { getSpaces } from "../actions";

async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // TODO: use this to show a welcome page/modal
  const { firstTime } = homeSearchParamsCache.parse(searchParams);

  const spaces = await getSpaces();

  return (
    <div className="max-w-3xl flex mx-auto w-full flex-col">
      {/* all content goes here */}
      {/* <div className="">hi {firstTime ? 'first time' : ''}</div> */}

      <div className="w-full h-96">
        <QueryInput initialSpaces={spaces} />
      </div>
    </div>
  );
}

export default Page;
