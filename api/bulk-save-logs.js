// Fil: /api/bulk-save-logs.js - KORREKT MULTI-USER VERSION
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Hent den aktive bruger fra det medsendte token
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const logsArray = req.body;
    if (!Array.isArray(logsArray) || logsArray.length === 0) {
      return res.status(400).json({ error: 'Request body must be a non-empty array of logs' });
    }

    // VIGTIGT: Her tilføjer vi brugerens ID til HVER log i array'et
    const logsToSave = logsArray.map(log => ({
        ...log,
        user_id: user.id
    }));

    // Brug 'upsert' til at opdatere eksisterende datoer eller indsætte nye
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(logsToSave, { onConflict: 'date, user_id' });

    if (error) {
      console.error('Supabase bulk save error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: `${logsToSave.length} logs saved/updated successfully!` });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}