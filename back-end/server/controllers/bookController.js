import { supabase } from '../config/supabase.js';

export const getBooks = async (req, res) => {
  try {
    const { data: books, error } = await supabase
      .from('books')
      .select('*');

    if (error) throw error;

    const formattedBooks = books.map((book, index) => ({
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

    const { data, error } = await supabase
      .from('books')
      .insert([
        {
          name: bookname,
          author,
          genre,
          copies
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};