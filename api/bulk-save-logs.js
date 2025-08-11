// Fil: /api/bulk-save-logs.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Vi forventer et array af logs fra frontend
    const logsArray = req.body;

    if (!Array.isArray(logsArray) || logsArray.length === 0) {
      return res.status(400).json({ error: 'Request body must be a non-empty array of logs' });
    }

    // Vi bruger 'upsert' til at opdatere eksisterende datoer eller indsætte nye
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(logsArray, { onConflict: 'date' });

    if (error) {
      console.error('Supabase bulk save error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: `${logsArray.length} logs saved/updated successfully!` });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}