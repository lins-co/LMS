import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import issueRoutes from './routes/issueRoutes.js';

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issue', issueRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});