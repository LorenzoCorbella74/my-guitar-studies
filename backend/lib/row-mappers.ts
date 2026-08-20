// Shared helpers to convert between SQLite row shapes and the JSON the Angular app expects.

export function toBool(value: unknown): boolean {
	return value === 1 || value === true;
}

export function fromBool(value: boolean | undefined): number {
	return value ? 1 : 0;
}

export function parseJsonArray<T>(value: string | null | undefined): T[] {
	if (!value) return [];
	try {
		return JSON.parse(value) as T[];
	} catch {
		return [];
	}
}

export function mapSessionRow(row: any) {
	return {
		id: row.id,
		title: row.title,
		tags: parseJsonArray<string>(row.tags),
		isFavorite: toBool(row.isFavorite),
		items: parseJsonArray<unknown>(row.items),
		groupId: row.groupId ?? undefined,
		groupOrder: row.groupOrder ?? undefined,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export function mapGroupRow(row: any) {
	return {
		id: row.id,
		name: row.name,
		tags: parseJsonArray<string>(row.tags),
		isGlobal: toBool(row.isGlobal),
		isFavorite: toBool(row.isFavorite),
		order: row.order,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export function mapPlanRow(row: any) {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		tags: parseJsonArray<string>(row.tags),
		isFavorite: toBool(row.isFavorite),
		milestones: parseJsonArray<unknown>(row.milestones),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export function mapTagRow(row: any) {
	return {
		id: row.id,
		name: row.name,
		createdAt: row.createdAt
	};
}

export function mapSettingsRow(row: any) {
	return {
		id: row.id,
		theme: row.theme,
		fretboardStyleIndex: row.fretboardStyleIndex,
		audioInstrument: row.audioInstrument ?? undefined,
		audioVolume: row.audioVolume ?? undefined,
		audioReverb: row.audioReverb ?? undefined,
		audioDetune: row.audioDetune ?? undefined,
		audioSustain: row.audioSustain === null || row.audioSustain === undefined ? undefined : toBool(row.audioSustain),
		playMetronome: row.playMetronome === null || row.playMetronome === undefined ? undefined : toBool(row.playMetronome),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}
