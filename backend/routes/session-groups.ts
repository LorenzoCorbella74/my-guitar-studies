import { Hono } from 'hono';
import { db } from '../db';
import { mapGroupRow, fromBool } from '../lib/row-mappers';

export const sessionGroups = new Hono();

sessionGroups.get('/', (c) => {
	const rows = db.query('SELECT * FROM session_groups ORDER BY "order" ASC').all();
	return c.json(rows.map(mapGroupRow));
});

sessionGroups.post('/', async (c) => {
	const body = await c.req.json<{ name: string; tags?: string[]; isGlobal?: boolean }>();
	const now = new Date().toISOString();
	const id = crypto.randomUUID();
	const maxOrderRow = db.query('SELECT MAX("order") as maxOrder FROM session_groups').get() as { maxOrder: number | null };
	const order = (maxOrderRow.maxOrder ?? -1) + 1;

	db.query(
		`INSERT INTO session_groups (id, name, tags, isGlobal, isFavorite, "order", createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`
	).run(id, body.name, JSON.stringify(body.tags ?? []), fromBool(body.isGlobal), order, now, now);

	const row = db.query('SELECT * FROM session_groups WHERE id = ?').get(id);
	return c.json(mapGroupRow(row), 201);
});

sessionGroups.patch('/:id', async (c) => {
	const id = c.req.param('id');
	const body = await c.req.json<Record<string, unknown>>();
	const existing = db.query('SELECT * FROM session_groups WHERE id = ?').get(id);
	if (!existing) return c.json(null, 404);

	const now = new Date().toISOString();
	const next = { ...mapGroupRow(existing), ...body, updatedAt: now };
	db.query(
		`UPDATE session_groups SET name = ?, tags = ?, isGlobal = ?, isFavorite = ?, "order" = ?, updatedAt = ?
     WHERE id = ?`
	).run(
		next.name,
		JSON.stringify(next.tags ?? []),
		fromBool(next.isGlobal),
		fromBool(next.isFavorite),
		next.order,
		now,
		id
	);
	const row = db.query('SELECT * FROM session_groups WHERE id = ?').get(id);
	return c.json(mapGroupRow(row));
});

// Deleting a group unassigns its sessions in the same transaction (mirrors the previous Firestore batch write).
sessionGroups.delete('/:id', (c) => {
	const id = c.req.param('id');
	const now = new Date().toISOString();
	db.transaction(() => {
		db.query('UPDATE sessions SET groupId = NULL, updatedAt = ? WHERE groupId = ?').run(now, id);
		db.query('DELETE FROM session_groups WHERE id = ?').run(id);
	})();
	return c.body(null, 204);
});

// Bulk-updates groupOrder for a set of sessions (mirrors the previous Firestore batch write).
sessionGroups.post('/reorder-sessions', async (c) => {
	const body = await c.req.json<{ sessions: { id: string; groupOrder: number }[] }>();
	const now = new Date().toISOString();
	db.transaction(() => {
		for (const s of body.sessions) {
			db.query('UPDATE sessions SET groupOrder = ?, updatedAt = ? WHERE id = ?').run(s.groupOrder, now, s.id);
		}
	})();
	return c.body(null, 204);
});
