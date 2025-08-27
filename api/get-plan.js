// Fil: /api/get-plan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    // 1. Hent brugeren fra access token
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 2. Hent planen for den specifikke bruger
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('user_id', user.id) // Brug brugerens ID
      .single();

    if (error) {
        if (error.code === 'PGRST116') { return res.status(204).end(); }
        throw error;
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}