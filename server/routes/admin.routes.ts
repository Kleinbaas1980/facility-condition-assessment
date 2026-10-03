import * as professionals from '../controllers/professional.controller.js';
import {Router} from 'express';
import {requireAuth,requireAdmin} from '../middleware/auth.js';
import {rateLimit} from '../middleware/rate-limit.js';
import * as admin from '../controllers/admin.controller.js';
export const adminRoutes=Router();adminRoutes.use(requireAuth,rateLimit('admin',100,60));
adminRoutes.get('/deletion-requests',admin.list);
adminRoutes.post('/deletion-requests/:id/review',requireAdmin,admin.review);

adminRoutes.get('/professionals',requireAdmin,professionals.list);
adminRoutes.post('/professionals',requireAdmin,professionals.save);
