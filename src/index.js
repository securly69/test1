import { createServer } from "node:http";
import { hostname } from "node:os";
import wisp from "wisp-server-node";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

// static paths
import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

// Register static files
fastify.register(fastifyStatic, { root: publicPath, decorateReply: true });
fastify.get("/uv/uv.config.js", (req, res) => res.sendFile("uv/uv.config.js", publicPath));
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });

// Function to gracefully shut down the server in local development
function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

// Only run locally, NOT on Vercel
if (!process.env.VERCEL) {
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	let port = parseInt(process.env.PORT || "8080");

	fastify.listen({ port, host: "0.0.0.0" }, () => {
		const address = fastify.server.address();
		console.log("Listening on:");
		console.log(`\thttp://localhost:${address.port}`);
		console.log(`\thttp://${hostname()}:${address.port}`);
	});
}

// Export Fastify as a request handler for Vercel
export default async function handler(req, res) {
	await fastify.ready();
	fastify.server.emit("request", req, res);
}
