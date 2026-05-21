export interface StudyPlan {
  id: string;
  name: string;
  description: string;
  tags: string[];
  isFavorite: boolean;
  milestones: PlanMilestone[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PlanMilestone {
  id: string;
  name: string;
  order: number;
  sessions: PlanSessionItem[];
}

export interface PlanSessionItem {
  sessionId: string;
  order: number;
  completionPercentage: number; // 0-100
  completed: boolean; // true quando completionPercentage === 100
  completedAt: Date | null;
}

export type PlanSortBy = 'updatedAt_desc' | 'updatedAt_asc' | 'name_asc' | 'name_desc' | 'progress_asc' | 'progress_desc';

export interface PlanProgress {
  totalSessions: number;
  completedSessions: number;
  percentage: number;
  milestones: MilestoneProgress[];
}

export interface MilestoneProgress {
  milestoneId: string;
  totalSessions: number;
  completedSessions: number;
  percentage: number;
}
