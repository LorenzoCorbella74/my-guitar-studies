import { Hono } from 'hono';
import { db } from '../db';
import { mapSessionRow, mapGroupRow, mapPlanRow, mapTagRow, mapSettingsRow, fromBool } from '../lib/row-mappers';

export const backup = new Hono();

// Full-database export/import, used to sync data manually between desktop instances (e.g. Windows <-> macOS).
backup.get('/export', (c) => {
	const sessions = db.query('SELECT * FROM sessions').all().map(mapSessionRow);
	const sessionGroups = db.query('SELECT * FROM session_groups').all().map(mapGroupRow);
	const studyPlans = db.query('SELECT * FROM study_plans').all().map(mapPlanRow);
	const tags = db.query('SELECT * FROM tags').all().map(mapTagRow);
	const settingsRow = db.query('SELECT * FROM settings WHERE id = ?').get('local');

	return c.json({
		exportedAt: new Date().toISOString(),
		sessions,
		sessionGroups,
		studyPlans,
		tags,
		settings: settingsRow ? mapSettingsRow(settingsRow) : null
	});
});

backup.post('/import', async (c) => {
	const body = await c.req.json<{
		sessions?: any[];
		sessionGroups?: any[];
		studyPlans?: any[];
		tags?: any[];
		settings?: any;
	}>();

	db.transaction(() => {
		db.exec('DELETE FROM sessions');
		db.exec('DELETE FROM session_groups');
		db.exec('DELETE FROM study_plans');
		db.exec('DELETE FROM tags');
		db.exec('DELETE FROM settings');

		const insertSession = db.query(
			`INSERT INTO sessions (id, title, tags, isFavorite, items, groupId, groupOrder, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		);
		for (const s of body.sessions ?? []) {
			insertSession.run(
				s.id,
				s.title || '',
				JSON.stringify(s.tags ?? []),
				fromBool(s.isFavorite),
				JSON.stringify(s.items ?? []),
				s.groupId ?? null,
				s.groupOrder ?? null,
				s.createdAt,
				s.updatedAt
			);
		}

		const insertGroup = db.query(
			`INSERT INTO session_groups (id, name, tags, isGlobal, isFavorite, "order", createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		);
		for (const g of body.sessionGroups ?? []) {
			insertGroup.run(
				g.id,
				g.name || '',
				JSON.stringify(g.tags ?? []),
				fromBool(g.isGlobal),
				fromBool(g.isFavorite),
				g.order ?? 0,
				g.createdAt,
				g.updatedAt
			);
		}

		const insertPlan = db.query(
			`INSERT INTO study_plans (id, name, description, tags, isFavorite, milestones, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		);
		for (const p of body.studyPlans ?? []) {
			insertPlan.run(
				p.id,
				p.name || '',
				p.description || '',
				JSON.stringify(p.tags ?? []),
				fromBool(p.isFavorite),
				JSON.stringify(p.milestones ?? []),
				p.createdAt,
				p.updatedAt
			);
		}

		const insertTag = db.query(`INSERT INTO tags (id, name, createdAt) VALUES (?, ?, ?)`);
		for (const t of body.tags ?? []) {
			insertTag.run(t.id, t.name || '', t.createdAt);
		}

		if (body.settings) {
			const s = body.settings;
			db.query(
				`INSERT INTO settings
           (id, theme, fretboardStyleIndex, audioInstrument, audioVolume, audioReverb, audioDetune, audioSustain, playMetronome, createdAt, updatedAt)
         VALUES ('local', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).run(
				s.theme || 'light',
				s.fretboardStyleIndex ?? 0,
				s.audioInstrument ?? null,
				s.audioVolume ?? null,
				s.audioReverb ?? null,
				s.audioDetune ?? null,
				s.audioSustain === undefined ? null : fromBool(s.audioSustain),
				s.playMetronome === undefined ? null : fromBool(s.playMetronome),
				s.createdAt,
				s.updatedAt
			);
		}
	})();

	return c.json({ imported: true });
});
