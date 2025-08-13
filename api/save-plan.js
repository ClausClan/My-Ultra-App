// Fil: /api/save-plan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { planName, planData } = req.body;
    // Vi bruger upsert og et fast id: 1 for at sikre, at vi altid overskriver den ene "aktive" plan.
    const { error } = await supabase.from('training_plans').upsert({ id: 1, plan_name: planName, plan_data: planData });
    if (error) throw error;
    res.status(200).json({ message: 'Plan saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}