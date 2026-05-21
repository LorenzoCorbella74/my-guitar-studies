import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';
import { SettingsPage } from './pages/settings/settings';
import { LoginPage } from './pages/login/login';
import { SessionsListPage } from './pages/sessions/sessions';
import { SessionEditorPage } from './pages/session-editor/session-editor';
import { StudyPlansListPage } from './pages/study-plans/study-plans';
import { StudyPlanEditorPage } from './pages/study-plan-editor/study-plan-editor';
import { authGuard } from './guards/auth.guard';
import { AppRoutes } from './enums/routes.enum';

export const routes: Routes = [
  { 
    path: AppRoutes.Home, 
    component: HomePage, 
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: AppRoutes.Sessions, pathMatch: 'full' },
      { path: AppRoutes.Sessions, component: SessionsListPage },
      { path: AppRoutes.SessionNew, component: SessionEditorPage },
      { path: AppRoutes.SessionEdit, component: SessionEditorPage },
      { path: AppRoutes.StudyPlans, component: StudyPlansListPage },
      { path: AppRoutes.StudyPlanNew, component: StudyPlanEditorPage },
      { path: AppRoutes.StudyPlanEdit, component: StudyPlanEditorPage },
      { path: AppRoutes.Settings, component: SettingsPage },
    ]
  }
];
