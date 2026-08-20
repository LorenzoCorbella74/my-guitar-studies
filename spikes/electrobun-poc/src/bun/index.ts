import { BrowserWindow, Updater } from "electrobun/bun";
import { Database } from "bun:sqlite";
import { Hono } from "hono";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const API_PORT = 5174;

// Spike goal: prove Hono + bun:sqlite can run in-process inside the Electrobun main process.
const db = new Database(":memory:");
db.run("CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)");

const api = new Hono();
api.get("/api/notes", (c) => c.json(db.query("SELECT * FROM notes").all()));
api.post("/api/notes", async (c) => {
	const { text } = await c.req.json<{ text: string }>();
	db.run("INSERT INTO notes (text) VALUES (?)", [text]);
	return c.json(db.query("SELECT * FROM notes").all());
});

Bun.serve({ port: API_PORT, fetch: api.fetch });
console.log(`Hono API listening on http://localhost:${API_PORT}`);

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
	title: "Angular App",
	url,
	frame: {
		width: 900,
		height: 700,
		x: 200,
		y: 200,
	},
});

console.log("Angular app started!");
