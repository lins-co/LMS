import express from 'express';
import { getBooks, createBook } from '../controllers/bookController.js';

const router = express.Router();

router.get('/', getBooks);
router.post('/', createBook);

export default router;