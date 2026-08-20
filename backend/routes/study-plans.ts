import { Hono } from 'hono';
import { db } from '../db';
import { mapPlanRow, fromBool } from '../lib/row-mappers';

export const studyPlans = new Hono();

studyPlans.get('/', (c) => {
	const rows = db.query('SELECT * FROM study_plans ORDER BY updatedAt DESC').all();
	return c.json(rows.map(mapPlanRow));
});

studyPlans.get('/:id', (c) => {
	const row = db.query('SELECT * FROM study_plans WHERE id = ?').get(c.req.param('id'));
	if (!row) return c.json(null, 404);
	return c.json(mapPlanRow(row));
});

studyPlans.post('/', async (c) => {
	const body = await c.req.json<{ name: string; description?: string; tags?: string[]; isFavorite?: boolean }>();
	const now = new Date().toISOString();
	const id = crypto.randomUUID();
	db.query(
		`INSERT INTO study_plans (id, name, description, tags, isFavorite, milestones, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, '[]', ?, ?)`
	).run(id, body.name, body.description ?? '', JSON.stringify(body.tags ?? []), fromBool(body.isFavorite), now, now);
	const row = db.query('SELECT * FROM study_plans WHERE id = ?').get(id);
	return c.json(mapPlanRow(row), 201);
});

studyPlans.patch('/:id', async (c) => {
	const id = c.req.param('id');
	const body = await c.req.json<Record<string, unknown>>();
	const existing = db.query('SELECT * FROM study_plans WHERE id = ?').get(id);
	if (!existing) return c.json(null, 404);

	const now = new Date().toISOString();
	const next = { ...mapPlanRow(existing), ...body, updatedAt: now };
	db.query(
		`UPDATE study_plans SET name = ?, description = ?, tags = ?, isFavorite = ?, milestones = ?, updatedAt = ?
     WHERE id = ?`
	).run(
		next.name,
		next.description,
		JSON.stringify(next.tags ?? []),
		fromBool(next.isFavorite),
		JSON.stringify(next.milestones ?? []),
		now,
		id
	);
	const row = db.query('SELECT * FROM study_plans WHERE id = ?').get(id);
	return c.json(mapPlanRow(row));
});

studyPlans.delete('/:id', (c) => {
	db.query('DELETE FROM study_plans WHERE id = ?').run(c.req.param('id'));
	return c.body(null, 204);
});
