import { Router } from 'express';
import { notFound } from '../middleware/errorHandler.js';
import { healthRouter } from './health.js';

export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);

// Feature routers get mounted here once the spec lands:
// apiRouter.use('/memories', memoriesRouter);

// Unknown /api/* must stay JSON — never fall through to the SPA fallback.
apiRouter.use(notFound);
