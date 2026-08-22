import { Session, SessionGroup, Tag } from './session.model';
import { StudyPlan } from './study-plan.model';
import { UserSettings } from './user-settings.model';

export interface UserBackup {
  schemaVersion: 1;
  exportedAt: string;
  settings: UserSettings | null;
  tags: Tag[];
  sessionGroups: SessionGroup[];
  sessions: Session[];
  studyPlans: StudyPlan[];
}
