import React from "react";
import { chatSearchParamsCache } from "../../../../lib/searchParams";
import ChatWindow from "../chatWindow";

async function Page({
	searchParams,
}: {
	searchParams: Record<string, string | string[] | undefined>;
}) {
	const q = (searchParams?.q as string) ?? "";
	return (
		<ChatWindow
			proMode={false}
			q={q}
			spaces={[]}
			initialChat={undefined}
			threadId={"idk"}
		/>
	);
}

export default Page;
