import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sessions } from './routes/sessions';
import { sessionGroups } from './routes/session-groups';
import { studyPlans } from './routes/study-plans';
import { tags } from './routes/tags';
import { settings } from './routes/settings';
import { backup } from './routes/backup';

export const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.route('/api/sessions', sessions);
app.route('/api/session-groups', sessionGroups);
app.route('/api/study-plans', studyPlans);
app.route('/api/tags', tags);
app.route('/api/settings', settings);
app.route('/api/backup', backup);
