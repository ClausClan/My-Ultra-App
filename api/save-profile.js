import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // 1. Hent brugeren fra access token
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const profileData = req.body;
    // 2. Tilføj brugerens ID til de data, vi gemmer. Fjern det faste ID.
    const dataToSave = { ...profileData, user_id: user.id };

    // 3. Brug upsert med user_id som onConflict-kolonne for at sikre, at brugeren kun har én profil.
    const { error } = await supabase
      .from('profiles')
      .upsert(dataToSave, { onConflict: 'user_id' });

    if (error) { throw error; }

    res.status(200).json({ message: 'Profile saved successfully!' });

  } catch (err) {
    console.error("Fejl ved at gemme profil:", err);
    res.status(500).json({ error: 'Failed to save profile data' });
  }
}