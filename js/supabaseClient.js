// js/supabaseClient.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Hent din URL og anon key fra Supabase Dashboard > Settings > API
const supabaseUrl = onkrxdzynpfeukjqwokj.supabase.co;
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ua3J4ZHp5bnBmZXVranF3b2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTUzMTMsImV4cCI6MjA3MDQzMTMxM30.GJTr-dwddImvuwkr9sYdXvKp7Y_KqKrRJuBtyXXPXpc;

// Opret og eksporter en enkelt Supabase client, som hele appen kan bruge
export const supabase = createClient(supabaseUrl, supabaseAnonKey);