import { GenerativeModel } from '@google/generative-ai';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { CloudflareVectorizeStore } from '@langchain/cloudflare';
import { Request } from '@cloudflare/workers-types';
import puppeteer from '@cloudflare/puppeteer';

export async function GET(request: Request, _: CloudflareVectorizeStore, embeddings: OpenAIEmbeddings, model: GenerativeModel, env?: Env) {
	const { searchParams } = new URL(request.url);
	let url = searchParams.get('url');
	let img: Buffer;
	if (url) {
		url = new URL(url).toString(); // normalize
		const browser = await puppeteer.launch(env?.MYBROWSER);
		const page = await browser.newPage();
		await page.goto(url);

		// Innertext of content
		const contentElement = await page.$('body');
		const content = await page.evaluate((element) => element.innerText, contentElement);

		await browser.close();

		return new Response(content, {
			headers: {
				'content-type': 'text/html',
			},
		});
	} else {
		return new Response('Please add an ?url=https://example.com/ parameter');
	}
}
