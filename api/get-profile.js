// Fil: /api/get-profile.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Hent den første række fra 'profiles'-tabellen.
    // .single() sikrer, at vi får et objekt tilbage, ikke et array.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();

    if (error) { throw error; }

    res.status(200).json(data);

  } catch (err) {
    console.error("Fejl ved hentning af profil:", err);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
}