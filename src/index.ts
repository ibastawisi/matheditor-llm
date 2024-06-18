import {
	StreamingTextResponse,
	AIStream,
	type AIStreamParser,
	formatStreamPart,
} from 'ai';

function parseCloudflareStream(): AIStreamParser {
	return data => {
		const json = JSON.parse(data) as {
			response: string;
			p: string | null;
		};
		const text = json.response;
		return formatStreamPart("text", text);
	};
}


export default {
	async fetch(request: Request, env: Env) {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
					"Access-Control-Allow-Headers": "content-type",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		const { messages } = await request.json() as { messages: { role: string; content: string }[] };

		const cfStream = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
			messages,
			max_tokens: 2048,
			stream: true,
		});

		const response = new Response(cfStream, { headers: { "content-type": "text/event-stream" } });

		const stream = AIStream(response, parseCloudflareStream());

		return new StreamingTextResponse(stream, { headers: { "Access-Control-Allow-Origin": "*" } });
	},
};