import express from 'express';
import { generateSql, draftEmail, sendEmailController, generateReport, getSmartSuggestion } from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate-sql', generateSql);
router.post('/draft-email', draftEmail);
router.post('/send-email', sendEmailController);
router.post('/generate-report', generateReport);
router.post('/smart-suggestion', getSmartSuggestion);

export default router;
