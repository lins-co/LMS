import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import issueRoutes from './routes/issueRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors({ origin: 'http://localhost:3039' }));
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issue', issueRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.send('Backend server is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});