// Fil: /api/get-profile.js - FORBEDRET VERSION

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Vi fjerner .single() og håndterer selv resultatet
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1); // Find højst 1 række

    if (error) { throw error; }

    // NYT: Tjek om vi rent faktisk fandt en profil
    if (!data || data.length === 0) {
      // Ingen profil fundet. Dette er en gyldig situation.
      // Vi sender et "204 No Content"-svar tilbage i stedet for en fejl.
      return res.status(204).end();
    }

    // Hvis vi fandt en profil, send den første (og eneste) tilbage som et objekt
    res.status(200).json(data[0]);

  } catch (err) {
    console.error("Fejl ved hentning af profil:", err);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
}