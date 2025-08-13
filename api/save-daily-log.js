// Fil: /api/save-daily-log.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const logData = req.body;

    if (!logData || !logData.date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // RETTET: Bruger nu .upsert() til at opdatere, hvis dagen allerede findes
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(logData, { onConflict: 'date' })
      .select();

    if (error) {
      // Hvis der er en fejl fra databasen, kastes den her
      throw error;
    }

    res.status(200).json({ message: 'Log saved/updated successfully!', savedData: data });

  } catch (err) {
    // Fanger alle fejl (både fra Supabase og andre) og sender en klar besked
    console.error('Server error in save-daily-log:', err);
    res.status(500).json({ 
        message: err.message, 
        details: err.details || 'No further details' 
    });
  }
}