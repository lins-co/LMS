import { supabase } from '../config/supabase.js';

export const issueBook = async (req, res) => {
  try {
    const { email, bookname } = req.body;

    if (!email || !bookname) {
      return res.status(400).json({ error: 'Email and book name are required' });
    }

    // Get student by email
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('email', email)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get book by name
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id')
      .eq('name', bookname)
      .single();

    if (bookError || !book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if book is already issued to this student
    const { data: existingIssue, error: existingError } = await supabase
      .from('issued_books')
      .select('*')
      .eq('student_id', student.id)
      .eq('book_id', book.id)
      .single();

    if (existingIssue) {
      return res.status(400).json({ error: 'Book already issued to this student' });
    }

    // Issue the book
    const { data: issuedBook, error: issueError } = await supabase
      .from('issued_books')
      .insert([
        {
          student_id: student.id,
          book_id: book.id
        }
      ])
      .select();

    if (issueError) throw issueError;

    res.status(201).json(issuedBook[0]);
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
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('email', email)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get book by name
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id')
      .eq('name', bookname)
      .single();

    if (bookError || !book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete the issue record
    const { error: deleteError } = await supabase
      .from('issued_books')
      .delete()
      .eq('student_id', student.id)
      .eq('book_id', book.id);

    if (deleteError) throw deleteError;

    res.status(200).json({ message: 'Book returned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};