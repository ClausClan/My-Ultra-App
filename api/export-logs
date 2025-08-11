// Fil: /api/export-logs.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*') // Hent alle kolonner
      .order('date', { ascending: true }); // Sorter efter dato

    if (error) {
      throw error;
    }

    // Sæt headers så browseren ved, at det er en fil, der skal downloades
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="ultra_app_kalender_backup.json"');
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: 'Failed to export data' });
  }
}