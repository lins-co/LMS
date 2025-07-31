import express from 'express';
import {
  generateSql,
  draftEmail,
  sendEmail,
  generateReport,
  smartSuggestion,
} from '../controllers/aiController.js';

const router = express.Router();

router.post('/generate-sql', generateSql);
router.post('/draft-email', draftEmail);
router.post('/send-email', sendEmail);
router.post('/generate-report', generateReport);
router.post('/smart-suggestion', smartSuggestion);

export default router;
