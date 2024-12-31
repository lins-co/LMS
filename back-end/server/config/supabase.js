import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.DB_URL;
const supabaseKey = process.env.DB_PASS;

export const supabase = createClient(supabaseUrl, supabaseKey);