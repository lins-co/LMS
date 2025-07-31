import pool from '../config/db.js';
import { differenceInDays } from 'date-fns';

export const getUsers = async (req, res) => {
  try {
    const { rows: students } = await pool.query('SELECT * FROM students');
    const { rows: issuedBooks } = await pool.query(
      `SELECT issued_books.*, students.*, books.*
       FROM issued_books
       JOIN students ON issued_books.student_id = students.id
       JOIN books ON issued_books.book_id = books.id`
    );

    const users = students.map((student, index) => {
      const userIssuedBooks = issuedBooks.filter(issue => issue.student_id === student.id);
      const hasFine = userIssuedBooks.some(issue => 
        differenceInDays(new Date(), new Date(issue.date_issued)) > 15
      );

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        subject: student.major,
        issued: userIssuedBooks.length > 0,
        avatarUrl: `/assets/images/avatar/avatar-${(index % 24) + 1}.webp`,
        fine: hasFine ? 'FINE-IMPOSED' : 'NO-FINE',
      };
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, subject } = req.body;

    if (!name || !email || !subject) {
      return res.status(400).json({ error: 'Name, email, and subject are required' });
    }

    const { rows } = await pool.query(
      'INSERT INTO students (name, email, major) VALUES ($1, $2, $3) RETURNING *',
      [name, email, subject]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};