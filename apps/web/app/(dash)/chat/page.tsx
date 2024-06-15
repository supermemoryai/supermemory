import ChatWindow from "./chatWindow";
import { chatSearchParamsCache } from "../../helpers/lib/searchParams";
// @ts-expect-error
await import("katex/dist/katex.min.css");

function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { firstTime, q, spaces } = chatSearchParamsCache.parse(searchParams);

  console.log(spaces);

  return <ChatWindow q={q} spaces={[]} />;
}

export default Page;
