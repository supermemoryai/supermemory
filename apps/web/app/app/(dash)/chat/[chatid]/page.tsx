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
	const { firstTime, q, spaces, proMode } =
		chatSearchParamsCache.parse(searchParams);

	let chat: Awaited<ReturnType<typeof getFullChatThread>>;

	try {
		chat = await getFullChatThread(params.chatid);
	} catch (e) {
		const error = e as Error;
		return <div>This page errored out: {error.message}</div>;
	}

	if (!chat.success || !chat.data) {
		console.error(chat.error);
		return <div>Chat not found. Check the console for more details.</div>;
	}

	return (
		<ChatWindow
			q={q}
			spaces={spaces ?? []}
			initialChat={chat.data.length > 0 ? chat.data : undefined}
			threadId={params.chatid}
			proMode={proMode}
		/>
	);
}

export default Page;
