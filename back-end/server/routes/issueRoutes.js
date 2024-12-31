import express from 'express';
import { issueBook, returnBook } from '../controllers/issueController.js';

const router = express.Router();

router.post('/', issueBook);
router.delete('/', returnBook);

export default router;