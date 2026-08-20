import { BrowserWindow, Updater } from 'electrobun/bun';
import { join } from 'node:path';
import { getUserDataDir } from './paths';

const API_PORT = 5175;
const DEV_SERVER_PORT = 4200; // Angular CLI default `ng serve` port.
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// Point the backend at a per-OS user-data directory before importing it, since
// backend/db.ts opens the SQLite file as soon as it's loaded.
process.env['DB_PATH'] = join(getUserDataDir(), 'app.db');
const { app } = await import('../../../backend/app');

Bun.serve({ port: API_PORT, fetch: app.fetch });
console.log(`Backend listening on http://localhost:${API_PORT}`);

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === 'dev') {
		try {
			await fetch(DEV_SERVER_URL, { method: 'HEAD' });
			console.log(`Using Angular dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log(`Angular dev server not running. Run 'ng serve' at the repo root for live reload.`);
		}
	}
	return 'views://mainview/index.html';
}

const url = await getMainViewUrl();

new BrowserWindow({
	title: 'My Guitar Studies',
	url,
	frame: {
		width: 1200,
		height: 800,
		x: 100,
		y: 100,
	},
});

console.log('My Guitar Studies desktop app started!');
