// js/supabaseClient.js

// 1. Vi henter 'createClient' funktionen fra det globale 'supabase' objekt,
//    som blev oprettet af script-tagget i index.html.
const { createClient } = supabase;

// 2. Hent din URL og anon key fra Supabase Dashboard > Settings > API
const supabaseUrl = 'https://onkrxdzynpfeukjqwokj.supabase.co'; // SKAL VÆRE INDENFOR ' '
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ua3J4ZHp5bnBmZXVranF3b2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTUzMTMsImV4cCI6MjA3MDQzMTMxM30.GJTr-dwddImvuwkr9sYdXvKp7Y_KqKrRJuBtyXXPXpc'; // SKAL OGSÅ VÆRE INDENFOR ' '

// 3. Opret og eksporter klienten, præcis som før.
// Denne del ændrer sig ikke.
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// BEMÆRK: Vi omdøber den eksporterede klient til 'supabaseClient' for at undgå
// navnekonflikt med den globale 'supabase' variabel.