// Fil: /api/get-logs.js
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
      .select('*')
      .order('date', { ascending: true });

    if (error) { throw error; }

    res.status(200).json(data); // Send dataene som almindelig JSON

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch log data' });
  }
}
