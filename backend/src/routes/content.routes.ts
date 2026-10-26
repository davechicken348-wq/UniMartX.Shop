import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { getHelpFAQs, getHelpGuides, getHelpTutorials, getHelpContent, getHelpSections, submitSupportRequest } from '../controllers/content.controller';

const router = Router();

router.get('/faq', asyncHandler(getHelpFAQs));
router.get('/guides', asyncHandler(getHelpGuides));
router.get('/tutorials', asyncHandler(getHelpTutorials));
router.get('/sections/:section', asyncHandler(getHelpContent));
router.get('/sections', asyncHandler(getHelpSections));
router.post('/support', asyncHandler(submitSupportRequest));

export default router;
