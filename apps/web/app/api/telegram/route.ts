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
  await ctx.reply(
    `Welcome to Supermemory bot, ${user.first_name}. I am here to help you remember things better.`,
  );
});

bot.on("message", async (ctx) => {
  await ctx.reply(
    "Hi there! This is Supermemory bot. I am here to help you remember things better.",
  );
});

export const POST = webhookCallback(bot, "std/http");
