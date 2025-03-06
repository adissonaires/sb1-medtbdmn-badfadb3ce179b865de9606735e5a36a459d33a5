import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Simple check for environment variables
if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);