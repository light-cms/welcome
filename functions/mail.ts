import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT || 587),
	secure: Number(process.env.SMTP_PORT) === 465,
	pool: true,
	maxConnections: 5,
	maxMessages: 100,
	auth: {
		user: process.env.SMTP_MAIL,
		pass: process.env.SMTP_PASSWORD,
	},
});

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "content-type": "application/json" },
			});
		}

		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		let body: Record<string, unknown> = {};
		try {
			body = (await request.json()) as Record<string, unknown>;
		} catch {
			body = {};
		}

		const to = typeof body.to === "string" ? body.to : undefined;
		if (!to) {
			return new Response(JSON.stringify({ ok: false, error: "missing `to`" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}

		const subject = typeof body.subject === "string" ? body.subject : "Hello from LightCMS";
		const text = typeof body.text === "string" ? body.text : typeof body.message === "string" ? body.message : "Hi there!";
		const html = typeof body.html === "string" ? body.html : undefined;
		const from = typeof body.from === "string" ? body.from : process.env.SMTP_MAIL;

		try {
			const info = await transporter.sendMail({
				from,
				to,
				subject,
				text,
				html,
			});

			return new Response(
				JSON.stringify({ ok: true, messageId: info.messageId, accepted: info.accepted }),
				{ headers: { "content-type": "application/json" } },
			);
		} catch (err) {
			return new Response(JSON.stringify({ ok: false, error: String(err) }), {
				status: 500,
				headers: { "content-type": "application/json" },
			});
		}
	},
};
