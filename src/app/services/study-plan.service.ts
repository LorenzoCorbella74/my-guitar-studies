import { inject, Injectable, signal } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, serverTimestamp, getFirestore as getFirestoreFn } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { StudyPlan, PlanMilestone, PlanSessionItem, PlanProgress, MilestoneProgress } from '../models/study-plan.model';
import { LoadingService } from './loading.service';

@Injectable({ providedIn: 'root' })
export class StudyPlanService {
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private firestore: Firestore;

  private _plans = signal<StudyPlan[]>([]);
  plans = this._plans.asReadonly();

  constructor() {
    this.firestore = getFirestoreFn(this.authService.app);
  }

  private get userId(): string | null {
    return this.authService.getUserId();
  }

  private get plansRef() {
    if (!this.userId) throw new Error('Not authenticated');
    return collection(this.firestore, `users/${this.userId}/studyPlans`);
  }

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
          cleaned[key] = this.removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }

    return obj;
  }

  private toDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return null;
  }

  async loadPlans(): Promise<void> {
    try {
      const q = query(this.plansRef, orderBy('updatedAt', 'desc'));
      const snapshot = await this.loadingService.track(getDocs(q));

      const data: StudyPlan[] = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        const milestones = (docData['milestones'] as PlanMilestone[]) || [];
        
        // Normalize sessions for backward compatibility
        const normalizedMilestones = milestones.map(m => ({
          ...m,
          sessions: (m.sessions || []).map(s => ({
            ...s,
            completionPercentage: s.completionPercentage !== undefined ? s.completionPercentage : (s.completed ? 100 : 0)
          }))
        }));

        data.push({
          id: doc.id,
          name: (docData['name'] as string) || '',
          description: (docData['description'] as string) || '',
          tags: (docData['tags'] as string[]) || [],
          isFavorite: (docData['isFavorite'] as boolean) || false,
          milestones: normalizedMilestones,
          createdAt: this.toDate(docData['createdAt']),
          updatedAt: this.toDate(docData['updatedAt'])
        } as StudyPlan);
      });
      this._plans.set(data);
    } catch (e) {
      console.error('loadPlans error:', e);
    }
  }

  async getPlan(id: string): Promise<StudyPlan | null> {
    if (!this.userId) return null;

    try {
      const docRef = doc(this.firestore, `users/${this.userId}/studyPlans`, id);
      const docSnap = await this.loadingService.track(getDoc(docRef));

      if (!docSnap.exists()) return null;

      const docData = docSnap.data();
      const milestones = (docData['milestones'] as PlanMilestone[]) || [];
      
      // Normalize sessions for backward compatibility
      const normalizedMilestones = milestones.map(m => ({
        ...m,
        sessions: (m.sessions || []).map(s => ({
          ...s,
          completionPercentage: s.completionPercentage !== undefined ? s.completionPercentage : (s.completed ? 100 : 0)
        }))
      }));

      return {
        id: docSnap.id,
        name: (docData['name'] as string) || '',
        description: (docData['description'] as string) || '',
        tags: (docData['tags'] as string[]) || [],
        isFavorite: (docData['isFavorite'] as boolean) || false,
        milestones: normalizedMilestones,
        createdAt: this.toDate(docData['createdAt']),
        updatedAt: this.toDate(docData['updatedAt'])
      } as StudyPlan;
    } catch (e) {
      console.error('getPlan error:', e);
      return null;
    }
  }

  async createPlan(data: { name: string; description?: string; tags?: string[]; isFavorite?: boolean }): Promise<string> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const now = serverTimestamp();
      const docRef = await this.loadingService.track(addDoc(this.plansRef, {
        name: data.name,
        description: data.description || '',
        tags: data.tags || [],
        isFavorite: data.isFavorite || false,
        milestones: [],
        createdAt: now,
        updatedAt: now
      }));
      await this.loadPlans();
      return docRef.id;
    } catch (e) {
      console.error('createPlan error:', e);
      throw e;
    }
  }

  async updatePlan(id: string, data: Partial<StudyPlan>): Promise<void> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const docRef = doc(this.firestore, `users/${this.userId}/studyPlans`, id);
      const cleanData = this.removeUndefined({
        ...data,
        updatedAt: serverTimestamp()
      });
      await this.loadingService.track(updateDoc(docRef, cleanData));
      await this.loadPlans();
    } catch (e) {
      console.error('updatePlan error:', e);
    }
  }

  async deletePlan(id: string): Promise<void> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const docRef = doc(this.firestore, `users/${this.userId}/studyPlans`, id);
      await this.loadingService.track(deleteDoc(docRef));
      await this.loadPlans();
    } catch (e) {
      console.error('deletePlan error:', e);
    }
  }

  async toggleFavorite(id: string): Promise<void> {
    const plan = this._plans().find(p => p.id === id);
    if (!plan) return;
    try {
      await this.updatePlan(id, { isFavorite: !plan.isFavorite });
    } catch (e) {
      console.error('toggleFavorite error:', e);
    }
  }

  // ====== MILESTONE METHODS ======

  async addMilestone(planId: string, name: string): Promise<void> {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan) return;

    const milestones = [...plan.milestones];
    if (milestones.length >= 10) {
      throw new Error('Limite massimo di 10 milestone raggiunto');
    }

    const newMilestone: PlanMilestone = {
      id: `milestone_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      order: milestones.length,
      sessions: []
    };

    milestones.push(newMilestone);
    await this.updatePlan(planId, { milestones });
  }

  async updateMilestone(planId: string, milestoneId: string, name: string): Promise<void> {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan) return;

    const milestones = plan.milestones.map(m =>
      m.id === milestoneId ? { ...m, name } : m
    );

    await this.updatePlan(planId, { milestones });
  }

  async deleteMilestone(planId: string, milestoneId: string): Promise<void> {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan) return;

    const milestones = plan.milestones
      .filter(m => m.id !== milestoneId)
      .map((m, index) => ({ ...m, order: index }));

    await this.updatePlan(planId, { milestones });
  }

  async reorderMilestones(planId: string, milestones: PlanMilestone[]): Promise<void> {
    const reordered = milestones.map((m, index) => ({ ...m, order: index }));
    await this.updatePlan(planId, { milestones: reordered });
  }

  // ====== SESSION METHODS ======

  async addSessionToMilestone(planId: string, milestoneId: string, sessionId: string): Promise<void> {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan) return;

    const milestones = plan.milestones.map(m => {
      if (m.id === milestoneId) {
        const sessions = [...m.sessions];
        const newSession: PlanSessionItem = {
          sessionId,
          order: sessions.length,
          completionPercentage: 0,
          completed: false,
          completedAt: null
        };
        sessions.push(newSession);
        return { ...m, sessions };
      }
      return m;
    });

    await this.updatePlan(planId, { milestones });
  }

  async removeSession(planId: string, milestoneId: string, sessionId: string): Promise<void> {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan) return;

    const milestones = plan.milestones.map(m => {
      if (m.id === milestoneId) {
        const sessions = m.sessions
          .filter(s => s.sessionId !== sessionId)
          .map((s, index) => ({ ...s, order: index }));
        return { ...m, sessions };
      }
      return m;
    });

    await this.updatePlan(planId, { milestones });
  }

  async toggleSessionCompleted(planId: string, milestoneId: string, sessionId: string): Promise<void> {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan) return;

    const milestones = plan.milestones.map(m => {
      if (m.id === milestoneId) {
        const sessions = m.sessions.map(s => {
          if (s.sessionId === sessionId) {
            return {
              ...s,
              completed: !s.completed,
              completedAt: !s.completed ? new Date() : null
            };
          }
          return s;
        });
        return { ...m, sessions };
      }
      return m;
    });

    await this.updatePlan(planId, { milestones });
  }

  async reorderSessions(planId: string, milestoneId: string, sessions: PlanSessionItem[]): Promise<void> {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan) return;

    const milestones = plan.milestones.map(m => {
      if (m.id === milestoneId) {
        const reordered = sessions.map((s, index) => ({ ...s, order: index }));
        return { ...m, sessions: reordered };
      }
      return m;
    });

    await this.updatePlan(planId, { milestones });
  }

  // ====== PROGRESS CALCULATION ======

  getPlanProgress(planId: string): PlanProgress {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        percentage: 0,
        milestones: []
      };
    }

    let totalSessions = 0;
    let completedSessions = 0;
    const milestones: MilestoneProgress[] = [];

    for (const milestone of plan.milestones) {
      const mTotal = milestone.sessions.length;
      const mCompleted = milestone.sessions.filter(s => s.completed).length;
      
      // Calcola la media delle percentuali di completamento
      const totalPercentage = milestone.sessions.reduce((sum, s) => sum + (s.completionPercentage || 0), 0);
      const mPercentage = mTotal > 0 ? Math.round(totalPercentage / mTotal) : 0;

      milestones.push({
        milestoneId: milestone.id,
        totalSessions: mTotal,
        completedSessions: mCompleted,
        percentage: mPercentage
      });

      totalSessions += mTotal;
      completedSessions += mCompleted;
    }

    // Calcola la media globale delle percentuali di tutte le sessioni
    const allSessions = plan.milestones.flatMap(m => m.sessions);
    const totalCompletionPercentage = allSessions.reduce((sum, s) => sum + (s.completionPercentage || 0), 0);
    const percentage = allSessions.length > 0 ? Math.round(totalCompletionPercentage / allSessions.length) : 0;

    return {
      totalSessions,
      completedSessions,
      percentage,
      milestones
    };
  }
}
