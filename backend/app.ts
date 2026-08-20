import { Hono } from 'hono';
import { sessions } from './routes/sessions';
import { sessionGroups } from './routes/session-groups';
import { studyPlans } from './routes/study-plans';
import { tags } from './routes/tags';
import { settings } from './routes/settings';

export const app = new Hono();

app.route('/api/sessions', sessions);
app.route('/api/session-groups', sessionGroups);
app.route('/api/study-plans', studyPlans);
app.route('/api/tags', tags);
app.route('/api/settings', settings);
