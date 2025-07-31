import pool from '../config/db.js';

export const issueBook = async (req, res) => {
  try {
    const { email, bookname } = req.body;

    if (!email || !bookname) {
      return res.status(400).json({ error: 'Email and book name are required' });
    }

    // Get student by email
    const { rows: studentRows } = await pool.query('SELECT id FROM students WHERE email = $1', [email]);
    const student = studentRows[0];

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get book by name
    const { rows: bookRows } = await pool.query('SELECT id FROM books WHERE name = $1', [bookname]);
    const book = bookRows[0];

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if book is already issued to this student
    const { rows: existingIssueRows } = await pool.query(
      'SELECT * FROM issued_books WHERE student_id = $1 AND book_id = $2',
      [student.id, book.id]
    );
    const existingIssue = existingIssueRows[0];

    if (existingIssue) {
      return res.status(400).json({ error: 'Book already issued to this student' });
    }

    // Issue the book
    const { rows: issuedBookRows } = await pool.query(
      'INSERT INTO issued_books (student_id, book_id) VALUES ($1, $2) RETURNING *',
      [student.id, book.id]
    );
    const issuedBook = issuedBookRows[0];

    res.status(201).json(issuedBook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const returnBook = async (req, res) => {
  try {
    const { email, bookname } = req.body;

    if (!email || !bookname) {
      return res.status(400).json({ error: 'Email and book name are required' });
    }

    // Get student by email
    const { rows: studentRows } = await pool.query('SELECT id FROM students WHERE email = $1', [email]);
    const student = studentRows[0];

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get book by name
    const { rows: bookRows } = await pool.query('SELECT id FROM books WHERE name = $1', [bookname]);
    const book = bookRows[0];

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete the issue record
    await pool.query('DELETE FROM issued_books WHERE student_id = $1 AND book_id = $2', [student.id, book.id]);

    res.status(200).json({ message: 'Book returned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};