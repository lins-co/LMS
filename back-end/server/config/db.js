
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_TZ9SwosbELQ1@ep-calm-bird-adakk250-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

export default pool;
