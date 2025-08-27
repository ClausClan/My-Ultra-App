// Fil: /api/save-plan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    // 1. Hent brugeren fra access token
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { planName, planData } = req.body;
    // 2. Byg payload med brugerens ID
    const planToSave = { user_id: user.id, plan_name: planName, plan_data: planData };

    // 3. Brug upsert til at overskrive den eksisterende plan for denne bruger
    const { error } = await supabase
        .from('training_plans')
        .upsert(planToSave, { onConflict: 'user_id' });

    if (error) throw error;
    res.status(200).json({ message: 'Plan saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}