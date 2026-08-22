import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  getFirestore as getFirestoreFn
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';
import { SessionService } from './session.service';
import { StudyPlanService } from './study-plan.service';
import { TagService } from './tag.service';
import { UserSettingsService } from './user-settings.service';
import { UserBackup } from '../models/user-backup.model';

@Injectable({ providedIn: 'root' })
export class UserDataBackupService {
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly sessionService = inject(SessionService);
  private readonly studyPlanService = inject(StudyPlanService);
  private readonly tagService = inject(TagService);
  private readonly userSettingsService = inject(UserSettingsService);
  private readonly firestore: Firestore;

  constructor() {
    this.firestore = getFirestoreFn(this.authService.app);
  }

  async exportData(): Promise<UserBackup> {
    const userId = this.requireUserId();
    const [tags, sessionGroups, sessions, studyPlans, settingsSnapshot] = await Promise.all([
      this.readCollection('tags'),
      this.readCollection('sessionGroups'),
      this.readCollection('sessions'),
      this.readCollection('studyPlans'),
      getDoc(doc(this.firestore, `users/${userId}/settings/${userId}`))
    ]);

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings: settingsSnapshot.exists()
        ? this.serialize({ id: settingsSnapshot.id, ...settingsSnapshot.data() }) as UserBackup['settings']
        : null,
      tags: this.serialize(tags) as UserBackup['tags'],
      sessionGroups: this.serialize(sessionGroups) as UserBackup['sessionGroups'],
      sessions: this.serialize(sessions) as UserBackup['sessions'],
      studyPlans: this.serialize(studyPlans) as UserBackup['studyPlans']
    };
  }

  async importData(backup: UserBackup): Promise<void> {
    const userId = this.requireUserId();
    this.validateBackup(backup);
    this.loadingService.showLoading();

    try {
      const collectionNames = ['tags', 'sessionGroups', 'sessions', 'studyPlans'] as const;
      const existing = await Promise.all(collectionNames.map(name => getDocs(collection(this.firestore, `users/${userId}/${name}`))));
      const settingsRef = doc(this.firestore, `users/${userId}/settings/${userId}`);

      const deleteRefs = existing.flatMap(snapshot => snapshot.docs.map(snapshotDoc => snapshotDoc.ref));
      const settingsSnapshot = await getDoc(settingsRef);
      if (settingsSnapshot.exists()) deleteRefs.push(settingsRef);
      await this.commitInChunks(deleteRefs.map(reference => ({ type: 'delete' as const, reference })));

      const writes = [
        ...this.toWrites('tags', backup.tags),
        ...this.toWrites('sessionGroups', backup.sessionGroups),
        ...this.toWrites('sessions', backup.sessions),
        ...this.toWrites('studyPlans', backup.studyPlans)
      ];
      if (backup.settings) {
        writes.push({
          type: 'set',
          reference: settingsRef,
          data: this.restoreDates(this.withoutId(backup.settings)) as Record<string, unknown>
        });
      }
      await this.commitInChunks(writes);

      await Promise.all([
        this.sessionService.loadSessions(),
        this.sessionService.loadGroups(),
        this.studyPlanService.loadPlans(),
        this.tagService.loadTags(),
        this.userSettingsService.loadSettings()
      ]);
    } finally {
      this.loadingService.hideLoading();
    }
  }

  parseBackup(json: string): UserBackup {
    const parsed: unknown = JSON.parse(json);
    this.validateBackup(parsed);
    return parsed;
  }

  private async readCollection(name: string): Promise<unknown[]> {
    const userId = this.requireUserId();
    const snapshot = await getDocs(collection(this.firestore, `users/${userId}/${name}`));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  }

  private toWrites(name: string, items: unknown[]): WriteOperation[] {
    const userId = this.requireUserId();
    return items.map(item => {
      const record = this.asRecord(item);
      const id = record['id'];
      if (typeof id !== 'string' || !id) throw new Error(`Documento ${name} senza id valido`);
      return {
        type: 'set',
        reference: doc(this.firestore, `users/${userId}/${name}/${id}`),
        data: this.restoreDates(this.withoutId(record)) as Record<string, unknown>
      };
    });
  }

  private async commitInChunks(operations: WriteOperation[]): Promise<void> {
    for (let index = 0; index < operations.length; index += 450) {
      const batch = writeBatch(this.firestore);
      operations.slice(index, index + 450).forEach(operation => {
        if (operation.type === 'delete') batch.delete(operation.reference);
        else batch.set(operation.reference, operation.data);
      });
      await this.loadingService.track(batch.commit());
    }
  }

  private validateBackup(value: unknown): asserts value is UserBackup {
    if (!value || typeof value !== 'object') throw new Error('Backup non valido');
    const backup = value as Record<string, unknown>;
    if (backup['schemaVersion'] !== 1) throw new Error('Versione backup non supportata');
    for (const key of ['tags', 'sessionGroups', 'sessions', 'studyPlans']) {
      if (!Array.isArray(backup[key])) throw new Error(`Campo backup non valido: ${key}`);
    }
    if (backup['settings'] !== null && typeof backup['settings'] !== 'object') {
      throw new Error('Campo backup non valido: settings');
    }
  }

  private serialize(value: unknown): unknown {
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(item => this.serialize(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.serialize(item)]));
    }
    return value;
  }

  private restoreDates(value: unknown, key = ''): unknown {
    if (typeof value === 'string' && key.endsWith('At') && !Number.isNaN(Date.parse(value))) {
      return new Date(value);
    }
    if (Array.isArray(value)) return value.map(item => this.restoreDates(item, key));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([childKey, item]) => [childKey, this.restoreDates(item, childKey)]));
    }
    return value;
  }

  private withoutId(value: unknown): Record<string, unknown> {
    const record = this.asRecord(value);
    const { id: _id, ...data } = record;
    return data;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Record backup non valido');
    return value as Record<string, unknown>;
  }

  private requireUserId(): string {
    const userId = this.authService.getUserId();
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }
}

type WriteOperation =
  | { type: 'delete'; reference: ReturnType<typeof doc> }
  | { type: 'set'; reference: ReturnType<typeof doc>; data: Record<string, unknown> };
