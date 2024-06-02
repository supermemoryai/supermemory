import ChatWindow from "./chatWindow";
import { chatSearchParamsCache } from "../../helpers/lib/searchParams";

function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { firstTime, q, spaces } = chatSearchParamsCache.parse(searchParams);

  console.log(spaces);

  return <ChatWindow q={q} />;
}

export default Page;
