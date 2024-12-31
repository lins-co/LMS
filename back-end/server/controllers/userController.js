import { supabase } from '../config/supabase.js';
import { differenceInDays } from 'date-fns';

export const getUsers = async (req, res) => {
  try {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*');

    if (studentsError) throw studentsError;

    const { data: issuedBooks, error: issuedError } = await supabase
      .from('issued_books')
      .select(`
        *,
        students(*),
        books(*)
      `);

    if (issuedError) throw issuedError;

    const users = students.map((student, index) => {
      const userIssuedBooks = issuedBooks.filter(issue => issue.student_id === student.id);
      const hasFine = userIssuedBooks.some(issue => 
        differenceInDays(new Date(), new Date(issue.date_issued)) > 15
      );

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        issued: userIssuedBooks.length > 0,
        avatarUrl: `/assets/images/avatar/avatar-${(index % 24) + 1}.webp`,
        fine: hasFine ? 'FINE-IMPOSED' : 'NO-FINE',
        subject: student.major
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

    const { data, error } = await supabase
      .from('students')
      .insert([
        { 
          name,
          email,
          major: subject // mapping subject to major field in database
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};