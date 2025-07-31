import pool from '../config/db.js';

export const getBooks = async (req, res) => {
  try {
    const { rows: books } = await pool.query('SELECT * FROM books');

    const formattedBooks = books.map((book) => ({
      id: book.id,
      authors: [book.author],
      name: book.name,
      coverUrl: `/assets/images/book/book.webp`
    }));

    res.json(formattedBooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createBook = async (req, res) => {
  try {
    const { bookname, author, genre, copies } = req.body;

    if (!bookname || !author || !genre || copies === undefined) {
      return res.status(400).json({ error: 'Book name, author, genre, and copies are required' });
    }

    const { rows } = await pool.query(
      'INSERT INTO books (name, author, genre, copies) VALUES ($1, $2, $3, $4) RETURNING *',
      [bookname, author, genre, copies]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};