import { getFullChatThread } from "@/app/actions/fetchers";
import { chatSearchParamsCache } from "@/lib/searchParams";
import ChatWindow from "../chatWindow";

async function Page({
  params,
  searchParams,
}: {
  params: { chatid: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { firstTime, q, spaces } = chatSearchParamsCache.parse(searchParams);

  const chat = await getFullChatThread(params.chatid);

  console.log(chat);

  if (!chat.success || !chat.data) {
    // TODO: handle this error
    return <div>Chat not found</div>;
  }

  console.log(chat.data);

  return (
    <ChatWindow
      q={q}
      spaces={spaces}
      initialChat={chat.data.length > 0 ? chat.data : undefined}
      threadId={params.chatid}
    />
  );
}

export default Page;
