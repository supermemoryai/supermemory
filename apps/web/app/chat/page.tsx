import { chatSearchParamsCache } from "../helpers/lib/searchParams";
import Menu from "../home/menu";
import Header from "../home/header";
import ChatWindow from "./chatWindow";

function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { firstTime, q, spaces } = chatSearchParamsCache.parse(searchParams);

  return (
    <main className="h-screen flex flex-col p-4 relative">
      <Menu />

      <Header />

      <ChatWindow q={q} spaces={spaces ?? []} />
    </main>
  );
}

export default Page;
