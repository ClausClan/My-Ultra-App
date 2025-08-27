// Fil: /api/get-logs.js - FORBEDRET TIL MULTI-USER
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // 1. Hent brugeren fra access token
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 2. Hent kun logs for den specifikke bruger
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id) // <-- Den vigtige tilføjelse
      .order('date', { ascending: true });

    if (error) { throw error; }

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch log data' });
  }
}