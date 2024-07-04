![og image](https://supermemory.ai/og-image.png)

# SuperMemory

Interested in helping build the best second brain for everyone? Join the discord https://discord.gg/2X2XsKz5AU. Contributions welcome.

<div align="center">
  <a href="https://github.com/Dhravya/Supermemory/stargazers">
    <img src="https://img.shields.io/github/stars/Dhravya/Supermemory?style=flat-square&logo=github" alt="GitHub stars">
  </a>
  <a href="https://github.com/Dhravya/Supermemory/network/members">
    <img src="https://img.shields.io/github/forks/Dhravya/supermemory?style=flat-square&logo=github&color=8ae8ff" alt="GitHub forks">
  </a>
  <a href="https://github.com/Dhravya/Supermemory/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/Dhravya/Supermemory?style=flat-square&logo=github" alt="GitHub contributors">
  </a>
  <a href="https://chrome.google.com/webstore/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc">
    <img src="https://img.shields.io/chrome-web-store/v/afpgkkipfdpeaflnpoaffkcankadgjfc?style=flat-square&color=yellow" alt="Chrome Web Store">
  </a>
</div>

## 👀 What is this?

Build your own second brain with supermemory. It's a ChatGPT for your bookmarks. Import tweets or save websites and content using the [chrome extension](https://chromewebstore.google.com/detail/supermemory/afpgkkipfdpeaflnpoaffkcankadgjfc?hl=en-GB&authuser=0) (the extension on webstore is not updated, please use the one in the repo)

Well, here's the thing - me and @yxshv save a _lot_ of content on the internet.

Twitter bookmarks, websites, snippets, etc.

But we never look back to it - to us, it's like throwing information in the void.

Supermemory fixes this.

## Key Features

- 💡 **Ideation**: Capture and save ideas effortlessly.
- 🔖 **Bookmarks**: Import, organize, and resurface bookmarks when needed.
- 📇 **Contacts**: Store and manage information about people you know.
- 🐦 **Twitter Bookmarks**: Import and utilize your saved tweets.
- 🔍 **Powerful Search**: Quickly find any saved information.
- 💬 **Chat with Collections**: Interact with specific knowledge bases.
- 🖼️ **Knowledge Canvas**: Organize information visually in a 2D canvas.
- ✍️ **Writing Assistant**: Use a markdown editor with AI assistance for content creation.
- 🔒 **Privacy Focused**: Ensures data security and privacy.
- 🏠 **Self Hostable**: Open source and easy to deploy locally.
- 🔗 **Integrations**: Compatible with Telegram, Twitter, and more to come.

## How do I use this?

Just go to [supermemory.ai](https://supermemory.ai) and sign in with your google account.

To use the chrome extension,

1. Get the chrome ext (click on the button)
2. Click on the "Extension Auth" button so the extension knows who you are :)
   ![chrome](https://i.dhr.wtf/r/Clipboard_Apr_15,_2024_at_10.47 AM.png)

## 👨‍💻 The Stack

<div align="center">
<img src="https://tech-orbit.wontory.dev/api?title=SuperMemory&tech=React,Next.js,Tailwind%20CSS,shadcn/ui,Drizzle,Cloudflare,Cloudflare%20Pages,Cloudflare%20Workers&size=900&duration=20" alt="SuperMemory" width="400">
</div>

#### Architecture:

![overview](https://i.dhr.wtf/r/Clipboard_Apr_14,_2024_at_4.52 PM.png)

Supermemory has three main modules, managed by [turborepo](https://turbo.build):

#### `apps/web`: The main web UI.

The database, auth etc logic is here

![App preview](https://i.dhr.wtf/r/Clipboard_Apr_14,_2024_at_4.10 PM.png)

Built with:

- Nextjs 14
- [Next Auth](https://next-auth.js.org/)
- [Drizzle ORM](https://drizzle.team/)
- [Cloudflare D1 database](https://developers.cloudflare.com/d1/get-started/)
- Cloudflare ratelimiter
- [TailwindCSS](https://tailwindcss.com)
- [shadcn-ui](https://ui.shadcn.com)
- And some other amazing open source projects like [Novel](https://novel.sh) and [vaul](https://vaul.emilkowal.ski/)
- Hosted on [Cloudflare Pages](https://pages.cloudflare.com/)

#### `apps/extension`: Chrome extension

The chrome extension is one of the most important part of the setup, but is not required.This is to easily add pages to your memory.

![Chrome extension preview](https://i.dhr.wtf/r/Clipboard_Apr_14,_2024_at_3.54 PM.png)
![Import bookmarks](https://i.dhr.wtf/r/Clipboard_Apr_14,_2024_at_3.56 PM.png)

You can also use it to import all your twitter bookmarks!

Built with:

- [CRXJS](https://crxjs.dev/vite-plugin/getting-started/react/create-project)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com)
- [shadcn-ui](https://ui.shadcn.com)
- [React](https://react.dev/)

#### `apps/cf-ai-backend`: This module handles the vector store and AI response generation

This is where the magic happens!
Built with:

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare AI](https://ai.cloudflare.com)
- [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Cloudflare Browser Rendering](https://developers.cloudflare.com/browser-rendering/)
- [Cloudflare KV](https://developers.cloudflare.com/kv)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Dhravya/supermemory&type=Date)](https://star-history.com/#Dhravya/supermemory&Date)

## Contribute or self host

Supermemory is design to be set up easily locally and super duper easy to set up 💫

Please see the [SETUP-GUIDE.md](SETUP-GUIDE.md) for setup instructions.

### Contributing

Contributions are very welcome! A contribution can be as small as a ⭐ or even finding and creating issues.

<a href="https://github.com/Dhravya/SuperMemory/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Dhravya/SuperMemory" />
</a>