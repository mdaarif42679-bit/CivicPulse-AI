import { Router } from 'express';
import { asyncHandler as h } from '../utils/errors.js';
import { upload } from '../utils/upload.js';
import * as reports from '../controllers/reportsController.js';
import * as issues from '../controllers/issuesController.js';
import * as system from '../controllers/systemController.js';

const r = Router();
r.get('/health', (req, res) => res.json({ ok: true }));
r.get('/status', system.status);
r.get('/stats', system.stats);

r.get('/reports', reports.list);
r.post('/reports', upload, h(reports.create));
r.get('/reports/:id', reports.getOne);
r.get('/reports/:id/related', h(reports.related));
r.post('/analyze', h(reports.analyze));
r.post('/cluster', h(reports.cluster));

r.get('/issues', issues.list);
r.get('/issues/:id', issues.getOne);
r.post('/issues/:id/verify', issues.verify);
r.post('/issues/:id/status', issues.updateStatus);

r.post('/demo/load', system.demoLoad);
r.post('/demo/reset', system.demoReset);
export default r;
