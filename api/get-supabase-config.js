// Fil: /api/get-supabase-config.js

export default function handler(req, res) {
  // Vi udleverer KUN de offentligt-sikre nøgler
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase configuration is not set on the server.' });
  }

  res.status(200).json({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  });
}