import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import exceljs from 'exceljs';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateSql = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    You are a powerful text-to-SQL generator. Your task is to convert natural language questions into SQL queries for a PostgreSQL database.
    The database schema is as follows:

    - Table: "User"
      - Columns: "id" (UUID, Primary Key), "name" (TEXT), "email" (TEXT, Unique), "role" (TEXT, Default: 'MEMBER')

    - Table: "Book"
      - Columns: "id" (UUID, Primary Key), "title" (TEXT), "author" (TEXT), "isbn" (TEXT, Unique), "quantity" (INTEGER)

    - Table: "Issue"
      - Columns: "id" (UUID, Primary Key), "userId" (UUID, Foreign Key to "User"), "bookId" (UUID, Foreign Key to "Book"), "issuedAt" (TIMESTAMP, Default: NOW), "returnedAt" (TIMESTAMP)

    Based on this schema, please generate a SQL query that answers the following question:
    "${query}"

    Only return the SQL query, with no additional text or explanation.
    Ensure the query is syntactically correct for PostgreSQL.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const sqlQuery = response.text().replace(/`/g, '').replace('sql', '');

    // Basic validation to prevent destructive queries
    if (!sqlQuery.toLowerCase().startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed.' });
    }

    const data = await prisma.$queryRawUnsafe(sqlQuery);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate or execute SQL query.' });
  }
};

export const draftEmail = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // 1. Get users with overdue books
    const overdueIssues = await prisma.issue.findMany({
      where: {
        returnedAt: null,
        issuedAt: {
          lt: new Date(new Date().setDate(new Date().getDate() - 14)), // Assuming a 14-day loan period
        },
      },
      include: {
        user: true,
        book: true,
      },
    });

    if (overdueIssues.length === 0) {
      return res.json({ draft: 'No users with overdue books found.', recipients: [] });
    }

    const recipients = overdueIssues.map((issue) => issue.user.email);

    // 2. Create a prompt for the AI
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const aiPrompt = `
      You are an AI assistant for a library. Your task is to draft a reminder email to be sent to users with overdue books.
      The following users have overdue books:
      ${overdueIssues
        .map((issue) => `- ${issue.user.name} (Book: ${issue.book.title})`)
        .join('\n')}

      Based on this information, please draft a polite and professional email reminding them to return their books.
      The email should be generic enough to be sent to all of them.
      Do not include a subject line or any pleasantries like "Dear [User]".
      Just return the body of the email.
    `;

    // 3. Send the prompt to the AI
    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    const draft = response.text();

    // 4. Return the draft and recipients
    res.json({ draft, recipients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to draft email.' });
  }
};

export const sendEmail = async (req, res) => {
  const { subject, text, recipients } = req.body;

  if (!subject || !text || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Subject, text, and a non-empty array of recipients are required' });
  }

  try {
    // Create a test account with ethereal.email
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Library Management System" <no-reply@lms.com>',
      to: recipients.join(', '),
      subject,
      text,
    });

    res.json({ message: 'Emails sent successfully!', previewUrl: nodemailer.getTestMessageUrl(info) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send email.' });
  }
};

export const generateReport = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // 1. Generate SQL from query
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `
      You are a powerful text-to-SQL generator. Your task is to convert natural language questions into SQL queries for a PostgreSQL database.
      The database schema is as follows:

      - Table: "User"
        - Columns: "id" (UUID, Primary Key), "name" (TEXT), "email" (TEXT, Unique), "role" (TEXT, Default: 'MEMBER')

      - Table: "Book"
        - Columns: "id" (UUID, Primary Key), "title" (TEXT), "author" (TEXT), "isbn" (TEXT, Unique), "quantity" (INTEGER)

      - Table: "Issue"
        - Columns: "id" (UUID, Primary Key), "userId" (UUID, Foreign Key to "User"), "bookId" (UUID, Foreign Key to "Book"), "issuedAt" (TIMESTAMP, Default: NOW), "returnedAt" (TIMESTAMP)

      Based on this schema, please generate a SQL query that answers the following question:
      "${query}"

      Only return the SQL query, with no additional text or explanation.
      Ensure the query is syntactically correct for PostgreSQL.
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const sqlQuery = response.text().replace(/`/g, '').replace('sql', '');

    if (!sqlQuery.toLowerCase().startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed.' });
    }

    // 2. Execute SQL query
    const data = await prisma.$queryRawUnsafe(sqlQuery);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No data found for the report.' });
    }

    // 3. Create Excel workbook
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // 4. Add data to worksheet
    const columns = Object.keys(data[0]).map((key) => ({ header: key, key }));
    worksheet.columns = columns;
    worksheet.addRows(data);

    // 5. Send Excel file to client
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
};

export const smartSuggestion = async (req, res) => {
  const { query } = req.body;
  const lowerCaseQuery = query.toLowerCase();

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    let prompt;
    let contextData;

    // Scenario 1: Restocking suggestions
    if (lowerCaseQuery.includes('restock') || lowerCaseQuery.includes('low stock')) {
      contextData = await prisma.book.findMany({
        where: { quantity: { lt: 5 } }, // Books with less than 5 copies
        orderBy: { quantity: 'asc' },
      });

      prompt = `
        You are a library inventory management AI. Your task is to identify books that need restocking.
        The following books have low stock (fewer than 5 copies):
        ${contextData.map((book) => `- ${book.title} (Quantity: ${book.quantity})`).join('\n')}

        Based on this data, please provide a summary of books that need to be reordered.
      `;
    }
    // Scenario 2: Popularity/Trend suggestions
    else if (lowerCaseQuery.includes('popular') || lowerCaseQuery.includes('trends')) {
      const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
      contextData = await prisma.issue.findMany({
        where: { issuedAt: { gte: thirtyDaysAgo } },
        include: { book: true },
      });

      const bookCounts = contextData.reduce((acc, issue) => {
        acc[issue.book.title] = (acc[issue.book.title] || 0) + 1;
        return acc;
      }, {});

      const popularBooks = Object.entries(bookCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      prompt = `
        You are a library analytics AI. Your task is to identify popular books and genre trends from the last 30 days.
        Here are the most borrowed books recently:
        ${popularBooks.map((book) => `- ${book[0]} (borrowed ${book[1]} times)`).join('\n')}

        Based on this data, what are the most popular books and what genre trends can you identify?
      `;
    }
    // Scenario 3: General book recommendations
    else {
      contextData = await prisma.book.findMany({
        take: 20,
        orderBy: { title: 'asc' },
      });

      prompt = `
        You are a helpful library assistant AI. Your goal is to provide smart book recommendations.
        Here is a list of available books:
        ${contextData.map((book) => `- ${book.title} by ${book.author}`).join('\n')}

        Based on this list, provide a helpful suggestion for the user's query: "${query}"
      `;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestion = response.text();

    res.json({ suggestion });
  } catch (error) {
    console.error('Error in smartSuggestion:', error);
    res.status(500).json({ error: 'Failed to generate suggestion.' });
  }
};