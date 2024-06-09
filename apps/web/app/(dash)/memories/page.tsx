"use client";

import { NextIcon, SearchIcon, UrlIcon } from "@repo/ui/icons";
import Image from "next/image";
import React, { useState } from "react";

function page() {
  const [filter, setFilter] = useState("All")
  const setFilterfn = (i:string) => setFilter(i)

  const [search, setSearch] = useState("")
  return (
    <div className="max-w-3xl min-w-3xl py-36 h-full flex mx-auto w-full flex-col gap-12">
      <h2 className="text-white w-full font-medium text-2xl text-left">
        My Memories
      </h2>

      <div className="flex flex-col gap-4">
      <div className="w-full relative">
        <input
          type="text"
          className=" w-full py-3 rounded-md text-lg pl-8 bg-[#1F2428] outline-none"
          placeholder="search here..."
        />
        <Image className="absolute top-1/2 -translate-y-1/2 left-2" src={SearchIcon} alt="Search icon" />
      </div>

      <Filters filter={filter} setFilter={setFilterfn} />

      </div>
      <div>
        <div className="text-[#B3BCC5]">Spaces</div>
        <TabComponent title="AI Technologies" description="Resources 12" />
        <TabComponent title="Python Tricks" description="Resources 120" />
        <TabComponent title="JavaScript Hacks" description="Resources 14" />
      </div>

      <div>
        <div className="text-[#B3BCC5]">Pages</div>
        <LinkComponent title="How to make a custom AI model?" url="https://google.com" />
        <LinkComponent title="GPT 5 Release Date" url="https://wth.com" />
        <LinkComponent title="Why @sama never use uppercase" url="https://tom.com" />
      </div>
    </div>
  );
}

function TabComponent({title, description}: {title:string, description:string}){
  return (
    <div className="flex items-center my-6">
      <div>
        <div className="h-12 w-12 bg-[#1F2428] flex justify-center items-center rounded-md">
          {title.slice(0,2).toUpperCase()}
        </div>
      </div>
      <div className="grow px-4">
        <div className="text-lg text-[#fff]">{title}</div>
        <div>{description}</div>
      </div>
      <div>
      <Image src={NextIcon} alt="Search icon" />
      </div>
    </div>
  )
}

function LinkComponent({title, url}: {title:string, url:string}){
  return (
    <div className="flex items-center my-6">
    <div>
      <div className="h-12 w-12 bg-[#1F2428] flex justify-center items-center rounded-md">
        <Image src={UrlIcon} alt="Url icon" />
      </div>
    </div>
    <div className="grow px-4">
      <div className="text-lg text-[#fff]">{title}</div>
      <div>{url}</div>
    </div>
  </div>
  )
}

const FilterMethods = ["All", "Spaces", "Pages", "Notes"]
function Filters({setFilter, filter}:{setFilter: (i:string)=> void, filter: string}){
  return (
    <div className="flex gap-4">
      {FilterMethods.map((i)=> {
        return <div onClick={()=> setFilter(i)} className={`transition px-6 py-2 rounded-xl  ${i === filter ? "bg-[#21303D] text-[#369DFD]" : "text-[#B3BCC5] bg-[#1F2428] hover:bg-[#1f262d] hover:text-[#76a3cc]"}`}>{i}</div>
      })}
    </div>
  )
}

export default page;
