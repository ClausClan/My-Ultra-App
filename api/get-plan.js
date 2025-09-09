// Fil: /api/get-plan.js - MEST ROBUSTE VERSION
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // RETTET: Brug .limit(1) i stedet for .single() for at undgå fejl
    const { data, error } = await supabaseAdmin
      .from('training_plans')
      .select('*')
      .eq('user_id', user.id)
      .limit(1); // Hent højst én plan

    if (error) throw error;

    // Hvis ingen plan blev fundet, send 'No Content'
    if (!data || data.length === 0) {
      return res.status(204).end();
    }
    
    // Send den første (og eneste) plan tilbage
    res.status(200).json(data[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}