
import pool from './config/db.js';

const firstNames = ['John', 'Jane', 'Peter', 'Susan', 'Michael', 'Emily', 'Chris', 'Jessica', 'Matthew', 'Sarah'];
const lastNames = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'];
const subjects = ['Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'History', 'English', 'Art', 'Music', 'Geography'];
const bookAdjectives = ['The Lost', 'The Hidden', 'A Great', 'The Final', 'The Secret', 'An Old', 'The Last', 'A New', 'The First', 'The Little'];
const bookNouns = ['Castle', 'River', 'Mountain', 'Journey', 'Code', 'Tale', 'Mystery', 'Beginning', 'Island', 'Forest'];
const genres = ['Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Romance', 'Non-Fiction', 'History', 'Biography', 'Horror', 'Adventure'];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seedDatabase() {
  try {
    console.log('Starting to seed the database...');

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        major VARCHAR(255)
      );
    `);
    console.log('"students" table created or already exists.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        genre VARCHAR(100),
        copies INTEGER DEFAULT 1
      );
    `);
    console.log('"books" table created or already exists.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS issued_books (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        book_id INTEGER REFERENCES books(id),
        date_issued DATE DEFAULT CURRENT_DATE,
        UNIQUE(student_id, book_id)
      );
    `);
    console.log('"issued_books" table created or already exists.');

    // Generate and insert students
    const studentIds = [];
    for (let i = 0; i < 50; i++) {
      const name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
      const email = `student${i}@test.com`;
      const major = getRandomElement(subjects);
      const res = await pool.query(
        'INSERT INTO students (name, email, major) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
        [name, email, major]
      );
      if (res.rows[0]) {
        studentIds.push(res.rows[0].id);
      }
    }
    console.log(`Inserted ${studentIds.length} students.`);

    // Generate and insert books
    const bookIds = [];
    for (let i = 0; i < 50; i++) {
      const name = `${getRandomElement(bookAdjectives)} ${getRandomElement(bookNouns)}`;
      const author = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
      const genre = getRandomElement(genres);
      const copies = Math.floor(Math.random() * 5) + 1;
      const res = await pool.query(
        'INSERT INTO books (name, author, genre, copies) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, author, genre, copies]
      );
      bookIds.push(res.rows[0].id);
    }
    console.log(`Inserted ${bookIds.length} books.`);

    // Generate and insert issued books
    const issuedCount = 30; // Issue 30 books
    const shuffledStudentIds = studentIds.sort(() => 0.5 - Math.random()).slice(0, issuedCount);
    const shuffledBookIds = bookIds.sort(() => 0.5 - Math.random()).slice(0, issuedCount);

    let actualIssuedCount = 0;
    for (let i = 0; i < issuedCount; i++) {
        const student_id = shuffledStudentIds[i];
        const book_id = shuffledBookIds[i];
        // Subtract days to have varied issue dates
        const daysAgo = Math.floor(Math.random() * 30);
        const date_issued = new Date();
        date_issued.setDate(date_issued.getDate() - daysAgo);

        if(student_id && book_id) {
            await pool.query(
              'INSERT INTO issued_books (student_id, book_id, date_issued) VALUES ($1, $2, $3) ON CONFLICT (student_id, book_id) DO NOTHING',
              [student_id, book_id, date_issued]
            );
            actualIssuedCount++;
        }
    }
    console.log(`Inserted ${actualIssuedCount} issued book records.`);

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
    console.log('Database pool closed.');
  }
}

seedDatabase();
