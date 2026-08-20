import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StudyPlan, PlanMilestone, PlanSessionItem, PlanProgress, MilestoneProgress } from '../models/study-plan.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class StudyPlanService {
  private http = inject(HttpClient);

  private _plans = signal<StudyPlan[]>([]);
  plans = this._plans.asReadonly();

  private readonly plansUrl = `${API_BASE_URL}/study-plans`;

  private toDate(value: unknown): Date | null {
    return typeof value === 'string' ? new Date(value) : null;
  }

  private mapPlan(raw: any): StudyPlan {
    const milestones = (raw.milestones as PlanMilestone[]) || [];
    // Normalize sessions for backward compatibility
    const normalizedMilestones = milestones.map(m => ({
      ...m,
      sessions: (m.sessions || []).map(s => ({
        ...s,
        completionPercentage: s.completionPercentage !== undefined ? s.completionPercentage : (s.completed ? 100 : 0)
      }))
    }));

    return {
      ...raw,
      milestones: normalizedMilestones,
      createdAt: this.toDate(raw.createdAt),
      updatedAt: this.toDate(raw.updatedAt)
    } as StudyPlan;
  }

  async loadPlans(): Promise<void> {
    try {
      const rows = await firstValueFrom(this.http.get<any[]>(this.plansUrl));
      this._plans.set(rows.map(r => this.mapPlan(r)));
    } catch (e) {
      console.error('loadPlans error:', e);
    }
  }

  async getPlan(id: string): Promise<StudyPlan | null> {
    try {
      const row = await firstValueFrom(this.http.get<any>(`${this.plansUrl}/${id}`));
      return row ? this.mapPlan(row) : null;
    } catch (e) {
      console.error('getPlan error:', e);
      return null;
    }
  }

  async createPlan(data: { name: string; description?: string; tags?: string[]; isFavorite?: boolean }): Promise<string> {
    try {
      const row = await firstValueFrom(this.http.post<any>(this.plansUrl, data));
      await this.loadPlans();
      return row.id;
    } catch (e) {
      console.error('createPlan error:', e);
      throw e;
    }
  }

  async updatePlan(id: string, data: Partial<StudyPlan>): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`${this.plansUrl}/${id}`, data));
      await this.loadPlans();
    } catch (e) {
      console.error('updatePlan error:', e);
    }
  }

  async deletePlan(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.plansUrl}/${id}`));
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
