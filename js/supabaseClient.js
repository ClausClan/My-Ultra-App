// js/supabaseClient.js

// 1. Vi henter 'createClient' funktionen fra det globale 'supabase' objekt,
//    som blev oprettet af script-tagget i index.html.
const { createClient } = supabase;

// 2. Hent din URL og anon key fra Supabase Dashboard > Settings > API
const supabaseUrl = 'DIN_SUPABASE_URL'; // SKAL VÆRE INDENFOR ' '
const supabaseAnonKey = 'DIN_SUPABASE_ANON_KEY'; // SKAL OGSÅ VÆRE INDENFOR ' '

// 3. Opret og eksporter klienten, præcis som før.
// Denne del ændrer sig ikke.
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// BEMÆRK: Vi omdøber den eksporterede klient til 'supabaseClient' for at undgå
// navnekonflikt med den globale 'supabase' variabel.