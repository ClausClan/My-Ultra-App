// js/supabaseClient.js

// Importer 'createClient' funktionen direkte fra Supabase's officielle CDN.
// Dette er den moderne måde at gøre det på i et modul-system.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Udskift disse med dine faktiske nøgler fra din Supabase-projektindstillinger.
const SUPABASE_URL = 'https://onkrxdzynpfeukjqwokj.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ua3J4ZHp5bnBmZXVranF3b2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTUzMTMsImV4cCI6MjA3MDQzMTMxM30.GJTr-dwddImvuwkr9sYdXvKp7Y_KqKrRJuBtyXXPXpc';

// Opret klienten én gang.
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Eksporter klienten, så andre filer (som main.js) kan importere og bruge den.
// RETTELSE: Fra 'export default' til en navngiven eksport med { }.
export { supabaseClient };