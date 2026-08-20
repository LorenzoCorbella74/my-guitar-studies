import { Hono } from 'hono';
import { db } from '../db';
import { mapSessionRow, fromBool } from '../lib/row-mappers';

export const sessions = new Hono();

sessions.get('/', (c) => {
	const rows = db.query('SELECT * FROM sessions ORDER BY updatedAt DESC').all();
	return c.json(rows.map(mapSessionRow));
});

sessions.get('/:id', (c) => {
	const row = db.query('SELECT * FROM sessions WHERE id = ?').get(c.req.param('id'));
	if (!row) return c.json(null, 404);
	return c.json(mapSessionRow(row));
});

sessions.post('/', async (c) => {
	const body = await c.req.json<{ title: string }>();
	const now = new Date().toISOString();
	const id = crypto.randomUUID();
	db.query(
		`INSERT INTO sessions (id, title, tags, isFavorite, items, createdAt, updatedAt)
     VALUES (?, ?, '[]', 0, '[]', ?, ?)`
	).run(id, body.title, now, now);
	const row = db.query('SELECT * FROM sessions WHERE id = ?').get(id);
	return c.json(mapSessionRow(row), 201);
});

sessions.patch('/:id', async (c) => {
	const id = c.req.param('id');
	const body = await c.req.json<Record<string, unknown>>();
	const existing = db.query('SELECT * FROM sessions WHERE id = ?').get(id);
	if (!existing) return c.json(null, 404);

	const now = new Date().toISOString();
	const next = { ...mapSessionRow(existing), ...body, updatedAt: now };
	db.query(
		`UPDATE sessions SET title = ?, tags = ?, isFavorite = ?, items = ?, groupId = ?, groupOrder = ?, updatedAt = ?
     WHERE id = ?`
	).run(
		next.title,
		JSON.stringify(next.tags ?? []),
		fromBool(next.isFavorite),
		JSON.stringify(next.items ?? []),
		next.groupId ?? null,
		next.groupOrder ?? null,
		now,
		id
	);
	const row = db.query('SELECT * FROM sessions WHERE id = ?').get(id);
	return c.json(mapSessionRow(row));
});

sessions.delete('/:id', (c) => {
	db.query('DELETE FROM sessions WHERE id = ?').run(c.req.param('id'));
	return c.body(null, 204);
});
