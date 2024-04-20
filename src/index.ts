import {
	StreamingTextResponse,
	AIStream,
	type AIStreamParser,
	formatStreamPart,
} from 'ai';

export interface Env {
	AI: any;
}

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

		const { messages } = await request.json<{ messages: { role: string; content: string }[] }>();

		const cfStream = await env.AI.run("@hf/google/gemma-7b-it", {
			messages,
			stream: true,
		});

		const response = new Response(cfStream, { headers: { "content-type": "text/event-stream" } });

		const stream = AIStream(response, parseCloudflareStream());

		return new StreamingTextResponse(stream, { headers: { "Access-Control-Allow-Origin": "*" } });
	},
};