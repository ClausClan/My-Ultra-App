import { createClient } from '@supabase/supabase-js';

// Initialiser Supabase-klienten
// Vi henter vores hemmelige URL og nøgle fra Vercels Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Vi tillader kun POST-kald til dette endpoint
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Hent dataene fra den anmodning, som frontenden sender
    // 'req.body' vil indeholde { date: '2025-08-11', hrv: 60, rhr: 50, ... }
    const logData = req.body;

    if (!logData || !logData.date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Brug Supabase-klienten til at indsætte data i 'daily_logs'-tabellen
    // '.insert()' tager et objekt (eller et array af objekter)
    const { data, error } = await supabase
      .from('daily_logs')
      .insert([
        {
          date: logData.date,
          hrv: logData.hrv,
          rhr: logData.rhr,
          sleep_quality: logData.sleep_quality,
          pte: logData.pte,
          vo2max: logData.vo2max,
          avg_watt: logData.avg_watt,
          avg_hr: logData.avg_hr,
          notes: logData.notes,
          // 'user_id' vil vi tilføje senere, når vi har login
        }
      ])
      .select(); // '.select()' returnerer den række, vi lige har indsat

    // Håndter eventuelle fejl fra databasen
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Hvis alt går godt, send en succes-besked og de gemte data tilbage
    res.status(200).json({ message: 'Log saved successfully!', savedData: data });

  } catch (err) {
    // Håndter andre uventede server-fejl
    console.error('Server error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}