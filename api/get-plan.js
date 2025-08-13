// Fil: /api/get-plan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    // Vi henter altid planen med id: 1, da det er vores "aktive" plan.
    const { data, error } = await supabase.from('training_plans').select('*').eq('id', 1).single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}