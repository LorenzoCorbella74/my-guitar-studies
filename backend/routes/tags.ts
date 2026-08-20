import { Hono } from 'hono';
import { db } from '../db';
import { mapTagRow } from '../lib/row-mappers';

export const tags = new Hono();

tags.get('/', (c) => {
	const rows = db.query('SELECT * FROM tags ORDER BY name ASC').all();
	return c.json(rows.map(mapTagRow));
});

tags.post('/', async (c) => {
	const body = await c.req.json<{ name: string }>();
	const now = new Date().toISOString();
	const id = crypto.randomUUID();
	db.query('INSERT INTO tags (id, name, createdAt) VALUES (?, ?, ?)').run(id, body.name, now);
	const row = db.query('SELECT * FROM tags WHERE id = ?').get(id);
	return c.json(mapTagRow(row), 201);
});
