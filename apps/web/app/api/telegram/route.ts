import { db } from "@/server/db";
import { storedContent, users } from "@/server/db/schema";
import { cipher } from "@/server/encrypt";
import { eq } from "drizzle-orm";
import { Bot, webhookCallback } from "grammy";
import { User } from "grammy/types";

export const runtime = "edge";

if (!process.env.TELEGRAM_BOT_TOKEN) {
	throw new Error("TELEGRAM_BOT_TOKEN is not defined");
}

console.log("Telegram bot activated");
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new Bot(token);

bot.command("start", async (ctx) => {
	const user: User = (await ctx.getAuthor()).user;

	const cipherd = cipher(user.id.toString());
	await ctx.reply(
		`Welcome to Supermemory bot. I am here to help you remember things better. Click here to create and link your account: https://supermemory.ai/signin?telegramUser=${cipherd}`,
	);
});

bot.on("message", async (ctx) => {
	const user: User = (await ctx.getAuthor()).user;

	const cipherd = cipher(user.id.toString());

	const dbUser = await db.query.users
		.findFirst({
			where: eq(users.telegramId, user.id.toString()),
		})
		.execute();

	if (!dbUser) {
		await ctx.reply(
			`Welcome to Supermemory bot. I am here to help you remember things better. Click here to create and link your account: https://supermemory.ai/signin?telegramUser=${cipherd}`,
		);

		return;
	}

	const message = await ctx.reply("I'm thinking...");

	const response = await fetch(
		`${process.env.BACKEND_BASE_URL}/api/autoChatOrAdd?query=${ctx.message.text}&user=${dbUser.id}`,
		{
			method: "POST",
			headers: {
				Authorization: "Bearer " + process.env.BACKEND_SECURITY_KEY,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				// TODO: we can use the conversations API to get the last 5 messages
				// get chatHistory from this conversation.
				// Basically the last 5 messages between the user and the assistant.
				// In ths form of [{role: 'user' | 'assistant', content: string}]
				// https://grammy.dev/plugins/conversations
				chatHistory: [],
			}),
		},
	);

	if (response.status !== 200) {
		console.log("Failed to get response from backend");
		console.log(response.status);
		console.log(await response.text());
		await ctx.reply(
			"Sorry, I am not able to process your request at the moment.",
		);
		return;
	}

	const data = (await response.json()) as {
		status: string;
		response: string;
		contentAdded: {
			type: string;
			content: string;
			url: string;
		};
	};

	// TODO: we might want to enrich this data with more information
	if (data.contentAdded) {
		await db
			.insert(storedContent)
			.values({
				content: data.contentAdded.content,
				title: `${data.contentAdded.content.slice(0, 30)}... (Added from chatbot)`,
				description: "",
				url: data.contentAdded.url,
				baseUrl: data.contentAdded.url,
				image: "",
				savedAt: new Date(),
				userId: dbUser.id,
				type: data.contentAdded.type,
			})
			.returning({ id: storedContent.id });
	}

	await ctx.api.editMessageText(ctx.chat.id, message.message_id, data.response);
});

export const POST = webhookCallback(bot, "std/http");

export const GET = async () => {
	return new Response("OK", { status: 200 });
};
