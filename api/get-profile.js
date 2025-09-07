// Fil: /api/get-profile.js - MEST ROBUSTE VERSION
import { createClient } from '@supabase/supabase-js';

// Opret to klienter: En for bruger-auth, en med admin-rettigheder til data
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');
  try {
    // 1. Hent brugeren fra access token for at få deres ID
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.split(' ')[1]);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 2. Brug ADMIN-klienten til at hente data. Dette ignorerer RLS.
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id) // Vi finder stadig kun data for den specifikke bruger
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(204).end();
      throw error;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("Fejl i get-profile (admin):", err);
    res.status(500).json({ error: 'Failed to fetch profile data' });
  }
}