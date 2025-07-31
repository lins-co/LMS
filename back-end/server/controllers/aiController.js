import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../config/db.js';
import ExcelJS from 'exceljs';
import { createTestAccount, createTransporter, sendMail } from '../utils/mailer.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let mailerTransporter;
createTestAccount().then(account => {
  mailerTransporter = createTransporter(account);
});

const getTableSchema = async (tableName) => {
  const query = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1;
  `;
  const { rows } = await pool.query(query, [tableName]);
  return rows.map(row => `${row.column_name} ${row.data_type}`).join(', ');
};

export const generateSql = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const studentsSchema = await getTableSchema('students');
    const booksSchema = await getTableSchema('books');
    const issuedBooksSchema = await getTableSchema('issued_books');

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      You are a helpful AI assistant that converts natural language queries into SQL.
      You are interacting with a PostgreSQL database.
      The database has the following tables:
      - students: ${studentsSchema}
      - books: ${booksSchema}
      - issued_books: ${issuedBooksSchema}

      Based on the user's query, generate a SQL query to retrieve the requested information.
      Only generate SELECT queries. Do not generate any other type of query.
      If the query is not a SELECT query, return an error.

      User query: "${query}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const sqlQuery = response.text().trim().replace(/^```sql\n|```$/g, '');


    if (!sqlQuery.toLowerCase().startsWith('select')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }

    const { rows } = await pool.query(sqlQuery);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const draftEmail = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // 1. Find users with overdue books
        const overdueQuery = `
            SELECT s.name, s.email, b.name as book_name, ib.date_issued
            FROM issued_books ib
            JOIN students s ON ib.student_id = s.id
            JOIN books b ON ib.book_id = b.id
            WHERE ib.date_issued < NOW() - INTERVAL '15 days';
        `;
        const { rows: overdueUsers } = await pool.query(overdueQuery);

        if (overdueUsers.length === 0) {
            return res.json({
                draft: "No users with overdue books found.",
                recipients: []
            });
        }

        // 2. Use Gemini to draft the email
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const generationPrompt = `
            You are an AI assistant for a library. Your task is to draft a polite reminder email to students who have overdue books.
            
            Here is an example of a student with an overdue book:
            - Student Name: ${overdueUsers[0].name}
            - Book Title: ${overdueUsers[0].book_name}
            - Date Issued: ${overdueUsers[0].date_issued}

            The email should be generic and use placeholders like [Student Name] and [Book Title].
            It should remind them to return the book as soon as possible to avoid further fines.
            Keep the tone professional and friendly.

            User's instruction for the draft: "${prompt}"
        `;

        const result = await model.generateContent(generationPrompt);
        const response = await result.response;
        const draft = response.text();

        res.json({
            draft,
            recipients: overdueUsers.map(u => u.email)
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendEmailController = async (req, res) => {
    const { recipients, subject, text } = req.body;

    if (!recipients || !subject || !text) {
        return res.status(400).json({ error: 'Recipients, subject, and text are required.' });
    }

    if (!mailerTransporter) {
        return res.status(500).json({ error: 'Mailer not initialized.' });
    }

    const mailOptions = {
        from: '"Library Admin" <no-reply@library.com>',
        to: 'undisclosed-recipients', // BCC will be used
        bcc: recipients,
        subject: subject,
        text: text,
    };

    const result = await sendMail(mailerTransporter, mailOptions);

    if (result.success) {
        res.json({ message: 'Emails sent successfully!', previewUrl: result.previewUrl });
    } else {
        res.status(500).json({ error: 'Failed to send emails.' });
    }
};

export const generateReport = async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const studentsSchema = await getTableSchema('students');
        const booksSchema = await getTableSchema('books');
        const issuedBooksSchema = await getTableSchema('issued_books');

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompt = `
            You are a helpful AI assistant that converts natural language queries into SQL for generating reports.
            The user wants to generate an Excel report.
            Your task is to generate a single, valid SELECT SQL query based on the user's request.
            The database has the following tables:
            - students: ${studentsSchema}
            - books: ${booksSchema}
            - issued_books: ${issuedBooksSchema}

            User query: "${query}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const sqlQuery = response.text().trim().replace(/^```sql\n|```$/g, '');

        if (!sqlQuery.toLowerCase().startsWith('select')) {
            return res.status(400).json({ error: 'Only SELECT queries are allowed for reports.' });
        }

        const { rows, fields } = await pool.query(sqlQuery);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No data found for the report.' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');

        worksheet.columns = fields.map(field => ({ header: field.name, key: field.name, width: 20 }));
        worksheet.addRows(rows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getSmartSuggestion = async (req, res) => {
    try {
        const { query } = req.body;
        const lowerCaseQuery = query.toLowerCase();
        let context = '';
        let prompt = '';

        if (lowerCaseQuery.includes('popular genres')) {
            const { rows } = await pool.query(`
                SELECT b.genre, COUNT(ib.id) as issue_count
                FROM issued_books ib
                JOIN books b ON ib.book_id = b.id
                WHERE ib.date_issued > NOW() - INTERVAL '30 days'
                GROUP BY b.genre
                ORDER BY issue_count DESC
                LIMIT 5;
            `);
            context = `Based on the library data, here are the most popular genres in the last 30 days: ${JSON.stringify(rows)}.`;
            prompt = `You are a library assistant. The user wants to know about popular genres. Based on the following data, provide a friendly and informative response. Data: ${context}. User's query: "${query}"`;
        } else if (lowerCaseQuery.includes('restock')) {
            const { rows } = await pool.query(`
                SELECT name, author FROM books WHERE copies = 0;
            `);
            if (rows.length > 0) {
                context = `The following books are out of stock and need to be restocked: ${JSON.stringify(rows)}.`;
                prompt = `You are a library assistant. The user is asking about books that need restocking. Based on the data, inform the user which books are out of stock. Data: ${context}. User's query: "${query}"`;
            } else {
                prompt = `You are a library assistant. The user is asking about books that need restocking. All books are currently in stock. Inform the user about this.`;
            }
        } else {
            // Generic book suggestion
            const { rows } = await pool.query(`
                SELECT name, author, genre FROM books ORDER BY RANDOM() LIMIT 10;
            `);
            context = `Here is a random list of available books: ${JSON.stringify(rows)}.`;
            prompt = `You are a library assistant. The user is asking for a book suggestion. Based on the following list of books, recommend one or two and briefly explain why they might be interesting. Book list: ${context}. User's query: "${query}"`;
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ suggestion: text });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
