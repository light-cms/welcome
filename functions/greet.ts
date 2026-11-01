import { attachDatabasePool } from "@neon/functions";
import { parseTriggerDelivery } from "@neon/functions/triggers";
import { Pool } from "pg";
import nodemailer from "nodemailer";

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
attachDatabasePool(pool);

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST!,
	port: Number(process.env.SMTP_PORT || 587),
	secure: false,
	auth: {
		user: process.env.SMTP_MAIL!,
		pass: process.env.SMTP_PASSWORD!,
	},
});

async function ensureGreetedTable() {
	await pool.query(
		`CREATE TABLE IF NOT EXISTS greeted_users (
			user_id text PRIMARY KEY,
			greeted_at timestamptz NOT NULL DEFAULT now()
		)`,
	);
}

async function greetNewUsers() {
	await ensureGreetedTable();

	const { rows } = await pool.query(
		`SELECT u.id, u.email, u.name
		 FROM "user" u
		 LEFT JOIN greeted_users g ON g.user_id = u.id
		 WHERE g.user_id IS NULL`,
	);

	const results: Array<{ id: string; email: string; status: string; error?: string }> = [];

	for (const u of rows as Array<{ id: string; email: string; name: string | null }>) {
		try {
			await transporter.sendMail({
				from: process.env.SMTP_MAIL!,
				to: u.email,
				subject: "Welcome to LightCMS!",
				text: `Hi ${u.name || "there"},\n\nThanks for using LightCMS! We're glad to have you. Happy writing!\n If you have any suggestions or grievances, please let us know <a href="https://app.youform.com/forms/smwrhikc">form</a>.\n\n— The LightCMS team`,
			});
			await pool.query(
				`INSERT INTO greeted_users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
				[u.id],
			);
			results.push({ id: u.id, email: u.email, status: "sent" });
		} catch (err) {
			results.push({ id: u.id, email: u.email, status: "error", error: String(err) });
		}
	}

	return {
		total: rows.length,
		sent: results.filter((r) => r.status === "sent").length,
		failed: results.filter((r) => r.status === "error").length,
		results,
	};
}

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "GET" && url.pathname === "/health") {
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "content-type": "application/json" },
			});
		}

		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		// Authenticated trigger delivery from Neon.
		const parsed = await parseTriggerDelivery(request);
		if (parsed.ok) {
			const summary = await greetNewUsers();
			return new Response(
				JSON.stringify({ ok: true, trigger: parsed.invocation.type, ...summary }),
				{ headers: { "content-type": "application/json" } },
			);
		}

		// Manual invocation for testing/operations, gated by a shared secret.
		const secret = process.env.GREET_SECRET;
		const provided = request.headers.get("x-greet-secret");
		if (secret && provided && provided === secret) {
			const summary = await greetNewUsers();
			return new Response(JSON.stringify({ ok: true, manual: true, ...summary }), {
				headers: { "content-type": "application/json" },
			});
		}

		const status = parsed.error === "invalid_body" ? 400 : 401;
		return new Response(parsed.error, { status });
	},
};
