import { homedir } from 'node:os';
import { join } from 'node:path';

const APP_FOLDER_NAME = 'MyGuitarStudies';

/**
 * OS-specific user-data directory, mirroring standard desktop app conventions.
 */
export function getUserDataDir(): string {
	switch (process.platform) {
		case 'win32':
			return join(process.env['APPDATA'] || join(homedir(), 'AppData', 'Roaming'), APP_FOLDER_NAME);
		case 'darwin':
			return join(homedir(), 'Library', 'Application Support', APP_FOLDER_NAME);
		default:
			return join(homedir(), '.local', 'share', APP_FOLDER_NAME);
	}
}
