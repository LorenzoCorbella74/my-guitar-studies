/**
 * One-off migration: esporta i dati da Firestore (progetto Firebase esistente)
 * e li importa nel database SQLite locale, preservando gli ID dei documenti
 * (necessari per mantenere i riferimenti sessionId/groupId tra le tabelle).
 *
 * Uso:
 *   FIREBASE_SERVICE_ACCOUNT=./scripts/serviceAccountKey.json FIRESTORE_USER_ID=<uid> \
 *     bun run scripts/migrate-firestore-to-sqlite.ts
 *
 * Il service account JSON si scarica da:
 *   Firebase Console > Project Settings > Service Accounts > Generate new private key
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { db } from '../backend/db';

const SERVICE_ACCOUNT_PATH = process.env['FIREBASE_SERVICE_ACCOUNT'];
const USER_ID = process.env['FIRESTORE_USER_ID'];

if (!SERVICE_ACCOUNT_PATH || !USER_ID) {
	console.error('Imposta le variabili FIREBASE_SERVICE_ACCOUNT e FIRESTORE_USER_ID prima di eseguire lo script.');
	process.exit(1);
}

initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
const firestore = getFirestore();

function toIso(value: unknown): string {
	if (value instanceof Timestamp) return value.toDate().toISOString();
	if (value instanceof Date) return value.toISOString();
	return new Date().toISOString();
}

async function migrateSessions(): Promise<number> {
	const snapshot = await firestore.collection(`users/${USER_ID}/sessions`).get();
	const insert = db.query(
		`INSERT OR REPLACE INTO sessions (id, title, tags, isFavorite, items, groupId, groupOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	for (const doc of snapshot.docs) {
		const d = doc.data();
		insert.run(
			doc.id,
			d['title'] || '',
			JSON.stringify(d['tags'] || []),
			d['isFavorite'] ? 1 : 0,
			JSON.stringify(d['items'] || []),
			d['groupId'] ?? null,
			d['groupOrder'] ?? null,
			toIso(d['createdAt']),
			toIso(d['updatedAt'])
		);
	}
	return snapshot.size;
}

async function migrateGroups(): Promise<number> {
	const snapshot = await firestore.collection(`users/${USER_ID}/sessionGroups`).get();
	const insert = db.query(
		`INSERT OR REPLACE INTO session_groups (id, name, tags, isGlobal, isFavorite, "order", createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	);
	for (const doc of snapshot.docs) {
		const d = doc.data();
		insert.run(
			doc.id,
			d['name'] || '',
			JSON.stringify(d['tags'] || []),
			d['isGlobal'] ? 1 : 0,
			d['isFavorite'] ? 1 : 0,
			d['order'] || 0,
			toIso(d['createdAt']),
			toIso(d['updatedAt'])
		);
	}
	return snapshot.size;
}

async function migratePlans(): Promise<number> {
	const snapshot = await firestore.collection(`users/${USER_ID}/studyPlans`).get();
	const insert = db.query(
		`INSERT OR REPLACE INTO study_plans (id, name, description, tags, isFavorite, milestones, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	);
	for (const doc of snapshot.docs) {
		const d = doc.data();
		insert.run(
			doc.id,
			d['name'] || '',
			d['description'] || '',
			JSON.stringify(d['tags'] || []),
			d['isFavorite'] ? 1 : 0,
			JSON.stringify(d['milestones'] || []),
			toIso(d['createdAt']),
			toIso(d['updatedAt'])
		);
	}
	return snapshot.size;
}

async function migrateTags(): Promise<number> {
	const snapshot = await firestore.collection(`users/${USER_ID}/tags`).get();
	const insert = db.query(`INSERT OR IGNORE INTO tags (id, name, createdAt) VALUES (?, ?, ?)`);
	for (const doc of snapshot.docs) {
		const d = doc.data();
		insert.run(doc.id, d['name'] || '', toIso(d['createdAt']));
	}
	return snapshot.size;
}

async function migrateSettings(): Promise<number> {
	const docSnap = await firestore.doc(`users/${USER_ID}/settings/${USER_ID}`).get();
	if (!docSnap.exists) return 0;
	const d = docSnap.data()!;
	db.query(
		`INSERT OR REPLACE INTO settings
       (id, theme, fretboardStyleIndex, audioInstrument, audioVolume, audioReverb, audioDetune, audioSustain, playMetronome, createdAt, updatedAt)
     VALUES ('local', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		d['theme'] || 'light',
		d['fretboardStyleIndex'] ?? 0,
		d['audioInstrument'] ?? null,
		d['audioVolume'] ?? null,
		d['audioReverb'] ?? null,
		d['audioDetune'] ?? null,
		d['audioSustain'] === undefined ? null : (d['audioSustain'] ? 1 : 0),
		d['playMetronome'] === undefined ? null : (d['playMetronome'] ? 1 : 0),
		toIso(d['createdAt']),
		toIso(d['updatedAt'])
	);
	return 1;
}

async function main() {
	const counts = {
		sessions: await migrateSessions(),
		sessionGroups: await migrateGroups(),
		studyPlans: await migratePlans(),
		tags: await migrateTags(),
		settings: await migrateSettings()
	};
	console.log('Migrazione completata:', counts);
}

main().catch((e) => {
	console.error('Migrazione fallita:', e);
	process.exit(1);
});
