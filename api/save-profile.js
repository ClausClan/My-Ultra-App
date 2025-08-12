// Fil: /api/save-profile.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const profileData = req.body;

    // Sæt et fast ID, da vi kun har én profil indtil videre.
    // Dette sikrer, at 'upsert' altid opdaterer den samme række.
    const dataToSave = { id: 1, ...profileData };

    const { error } = await supabase
      .from('profiles')
      .upsert(dataToSave);

    if (error) { throw error; }

    res.status(200).json({ message: 'Profile saved successfully!' });

  } catch (err) {
    console.error("Fejl ved at gemme profil:", err);
    res.status(500).json({ error: 'Failed to save profile data' });
  }
}