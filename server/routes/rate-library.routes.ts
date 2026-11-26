import {Router} from 'express';
import {requireAuth,requireAdmin} from '../middleware/auth.js';
import {rateLimit} from '../middleware/rate-limit.js';
import * as controller from '../controllers/rate-library.controller.js';
export const rateLibraryRoutes=Router();
rateLibraryRoutes.use(requireAuth,rateLimit('rate-library',120,60));
rateLibraryRoutes.get('/',controller.list);
rateLibraryRoutes.post('/',requireAdmin,controller.save);
