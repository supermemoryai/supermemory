import { chatSearchParamsCache } from "../../helpers/lib/searchParams";
import ChatWindow from "./chatWindow";

function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { firstTime, q, spaces } = chatSearchParamsCache.parse(searchParams);

  return <ChatWindow q={q} spaces={spaces ?? []} />;
}

export default Page;
