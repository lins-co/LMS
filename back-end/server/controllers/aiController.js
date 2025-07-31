import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import exceljs from 'exceljs';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to get user's borrowing history
const getUserHistory = async (userId) => {
  return prisma.issue.findMany({
    where: { userId },
    include: { book: true },
    orderBy: { issuedAt: 'desc' },
    take: 10,
  });
};

export const generateSql = async (req, res) => {
  const { query } = req.body;
  const { id: userId, name: userName } = req.user;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    You are a powerful text-to-SQL generator for a library.
    The user you are interacting with is named "${userName}" and their ID is "${userId}".
    When they say "I" or "my", they are referring to themselves.

    The database schema is:
    - "User": id, name, email, role
    - "Book": id, title, author, isbn, quantity
    - "Issue": id, userId, bookId, issuedAt, returnedAt

    Based on this, convert the following question into a PostgreSQL query:
    "${query}"

    Only return the SQL query.
  `;

  try {
    const result = await model.generateContent(prompt);
    const sqlQuery = result.response.text().replace(/`/g, '').replace('sql', '');

    if (!sqlQuery.toLowerCase().startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed.' });
    }

    const data = await prisma.$queryRawUnsafe(sqlQuery);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate or execute SQL query.' });
  }
};

export const draftEmail = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const overdueIssues = await prisma.issue.findMany({
      where: {
        returnedAt: null,
        issuedAt: { lt: new Date(new Date().setDate(new Date().getDate() - 14)) },
      },
      include: { user: true, book: true },
    });

    if (overdueIssues.length === 0) {
      return res.json({ draft: 'No users with overdue books found.', recipients: [] });
    }

    const recipients = overdueIssues.map((issue) => issue.user.email);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const aiPrompt = `
      You are an AI assistant drafting a reminder email about overdue books.
      The following users have overdue books:
      ${overdueIssues.map((issue) => `- ${issue.user.name} (Book: ${issue.book.title})`).join('\n')}
      Draft a polite, generic email reminding them to return their books.
      Do not include a subject line. Just return the body of the email.
    `;

    const result = await model.generateContent(aiPrompt);
    const draft = result.response.text();
    res.json({ draft, recipients });
  } catch (error) {
    res.status(500).json({ error: 'Failed to draft email.' });
  }
};

export const sendEmail = async (req, res) => {
  const { subject, text, recipients } = req.body;

  if (!subject || !text || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Subject, text, and recipients are required' });
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });

    const info = await transporter.sendMail({
      from: '"Library Management System" <no-reply@lms.com>',
      to: recipients.join(', '),
      subject,
      text,
    });

    res.json({ message: 'Emails sent successfully!', previewUrl: nodemailer.getTestMessageUrl(info) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email.' });
  }
};

export const generateReport = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `
      Generate a PostgreSQL query for the following report request:
      "${query}"
      Schema: "User"(id, name), "Book"(id, title), "Issue"(id, userId, bookId, issuedAt, returnedAt).
      Only return the SQL query.
    `;
    const result = await model.generateContent(prompt);
    const sqlQuery = result.response.text().replace(/`/g, '').replace('sql', '');

    if (!sqlQuery.toLowerCase().startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed.' });
    }

    const data = await prisma.$queryRawUnsafe(sqlQuery);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No data found for the report.' });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    worksheet.columns = Object.keys(data[0]).map((key) => ({ header: key, key }));
    worksheet.addRows(data);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report.' });
  }
};

export const smartSuggestion = async (req, res) => {
  const { query } = req.body;
  const { id: userId, name: userName } = req.user;
  const lowerCaseQuery = query.toLowerCase();

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    let prompt;

    if (lowerCaseQuery.includes('my history') || lowerCaseQuery.includes('my books')) {
      const userHistory = await getUserHistory(userId);
      prompt = `
        You are a library assistant AI. The user, ${userName}, is asking about their borrowing history.
        Here is their recent history:
        ${userHistory.map((issue) => `- ${issue.book.title} (Issued: ${issue.issuedAt.toDateString()})`).join('\n')}
        Summarize this for them.
      `;
    } else if (lowerCaseQuery.includes('recommend')) {
        const userHistory = await getUserHistory(userId);
        const allBooks = await prisma.book.findMany({ take: 50 });
        prompt = `
          You are a book recommendation AI. The user, ${userName}, wants a recommendation.
          Their borrowing history includes: ${userHistory.map(issue => issue.book.title).join(', ')}.
          Here is a list of available books: ${allBooks.map(book => book.title).join(', ')}.
          Based on their history and the available books, suggest a few books they might enjoy.
        `;
    } else {
      // Fallback for general queries
      const allBooks = await prisma.book.findMany({ take: 20 });
      prompt = `
        You are a helpful library assistant. Answer the user's query.
        User: "${query}"
        Some available books are: ${allBooks.map(book => book.title).join(', ')}.
      `;
    }

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text();
    res.json({ suggestion });
  } catch (error) {
    console.error('Error in smartSuggestion:', error);
    res.status(500).json({ error: 'Failed to generate suggestion.' });
  }
};