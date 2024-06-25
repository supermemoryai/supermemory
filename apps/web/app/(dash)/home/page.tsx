"use client";

import React, { useEffect, useState } from "react";
import QueryInput from "./queryinput";
import { homeSearchParamsCache } from "@/lib/searchParams";
import { getSpaces } from "@/app/actions/fetchers";
import { useRouter } from "next/navigation";
import { createChatThread, linkTelegramToUser } from "@/app/actions/doers";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // TODO: use this to show a welcome page/modal
  // const { firstTime } = homeSearchParamsCache.parse(searchParams);

  const [telegramUser, setTelegramUser] = useState<string | undefined>(
    searchParams.telegramUser as string,
  );

  const { push } = useRouter();

  const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (telegramUser) {
      const linkTelegram = async () => {
        const response = await linkTelegramToUser(telegramUser);

        if (response.success) {
          toast.success("Your telegram has been linked successfully.");
        } else {
          toast.error("Failed to link telegram. Please try again.");
        }
      };

      linkTelegram();
    }

    getSpaces().then((res) => {
      if (res.success && res.data) {
        setSpaces(res.data);
        return;
      }
      // TODO: HANDLE ERROR
    });
  }, []);

  return (
    <div className="max-w-3xl h-full justify-center flex mx-auto w-full flex-col">
      {/* all content goes here */}
      {/* <div className="">hi {firstTime ? 'first time' : ''}</div> */}

      <div className="w-full pb-20">
        <QueryInput
          handleSubmit={async (q, spaces) => {
            const threadid = await createChatThread(q);

            push(
              `/chat/${threadid.data}?spaces=${JSON.stringify(spaces)}&q=${q}`,
            );
          }}
          initialSpaces={spaces}
        />
      </div>
    </div>
  );
}

export default Page;
