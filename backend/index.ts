import { app } from './app';

// Standalone entry point for local dev/testing; the desktop shell will import `app` directly instead.
const port = Number(process.env['PORT'] || 5175);
Bun.serve({ port, fetch: app.fetch });
console.log(`Backend listening on http://localhost:${port}`);
