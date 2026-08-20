import { Hono } from 'hono';
import { db } from '../db';
import { mapSettingsRow, fromBool } from '../lib/row-mappers';

export const settings = new Hono();

const SETTINGS_ID = 'local';

function createDefaultSettings() {
	const now = new Date().toISOString();
	db.query(
		`INSERT INTO settings (id, theme, fretboardStyleIndex, audioInstrument, audioVolume, audioReverb, audioDetune, audioSustain, playMetronome, createdAt, updatedAt)
     VALUES (?, 'light', 0, 'electric_piano_1', 0.7, 0.3, 0, 1, 1, ?, ?)`
	).run(SETTINGS_ID, now, now);
	return db.query('SELECT * FROM settings WHERE id = ?').get(SETTINGS_ID);
}

settings.get('/', (c) => {
	const row = db.query('SELECT * FROM settings WHERE id = ?').get(SETTINGS_ID) ?? createDefaultSettings();
	return c.json(mapSettingsRow(row));
});

settings.put('/', async (c) => {
	const body = await c.req.json<Record<string, unknown>>();
	const existingRow = db.query('SELECT * FROM settings WHERE id = ?').get(SETTINGS_ID) ?? createDefaultSettings();
	const now = new Date().toISOString();
	const next = { ...mapSettingsRow(existingRow), ...body, updatedAt: now };

	db.query(
		`UPDATE settings SET theme = ?, fretboardStyleIndex = ?, audioInstrument = ?, audioVolume = ?, audioReverb = ?, audioDetune = ?, audioSustain = ?, playMetronome = ?, updatedAt = ?
     WHERE id = ?`
	).run(
		next.theme,
		next.fretboardStyleIndex,
		next.audioInstrument ?? null,
		next.audioVolume ?? null,
		next.audioReverb ?? null,
		next.audioDetune ?? null,
		next.audioSustain === undefined ? null : fromBool(next.audioSustain),
		next.playMetronome === undefined ? null : fromBool(next.playMetronome),
		now,
		SETTINGS_ID
	);
	const row = db.query('SELECT * FROM settings WHERE id = ?').get(SETTINGS_ID);
	return c.json(mapSettingsRow(row));
});
