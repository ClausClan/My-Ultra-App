// Fil: /api/save-daily-log.js - FORBEDRET TIL MULTI-USER
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
    
    const logData = req.body;
    if (!logData || !logData.date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // 2. Tilføj brugerens ID til de data, vi skal gemme
    const dataToSave = { ...logData, user_id: user.id };

    // 3. Brug upsert til at opdatere, hvis en log for den dato OG bruger allerede findes
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(dataToSave, { onConflict: 'date, user_id' }) // <-- Vigtig ændring!
      .select();

    if (error) { throw error; }

    res.status(200).json({ message: 'Log saved/updated successfully!', savedData: data });

  } catch (err) {
    console.error('Server error in save-daily-log:', err);
    res.status(500).json({ message: err.message });
  }
}