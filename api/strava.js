// Fil: /api/strava.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Helper-funktion til Strava's token endpoint (uændret)
async function fetchStravaTokens(payload) {
    const stravaUrl = 'https://www.strava.com/oauth/token';
    const response = await fetch(stravaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error from Strava: ${errorData.message || 'Unknown error'}`);
    }
    return await response.json();
}

export default async function handler(req, res) {
    // NYT: Håndter browserens "spørge-anmodning" (preflight request)
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*'); // Tillad anmodninger fra alle domæner
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    // --- Håndter GET-anmodning (uændret) ---
    if (req.method === 'GET') {
        const stravaClientId = process.env.STRAVA_CLIENT_ID;
        if (!stravaClientId) {
            return res.status(500).json({ error: 'Strava Client ID is not configured.' });
        }
        return res.status(200).json({ clientId: stravaClientId });
    }

    // --- Håndter POST-anmodninger (uændret) ---
    if (req.method === 'POST') {
        const client_id = process.env.STRAVA_CLIENT_ID;
        const client_secret = process.env.STRAVA_CLIENT_SECRET;

        try {
            if (req.body.code && req.body.redirect_uri) {
                const { code, redirect_uri } = req.body;
                const payload = { client_id, client_secret, code, grant_type: 'authorization_code', redirect_uri };
                const data = await fetchStravaTokens(payload);
                return res.status(200).json(data);
            }

            if (req.body.refresh_token) {
                const { refresh_token } = req.body;
                const payload = { client_id, client_secret, refresh_token, grant_type: 'refresh_token' };
                const data = await fetchStravaTokens(payload);
                return res.status(200).json(data);
            }

            return res.status(400).json({ message: 'Invalid POST request.' });

        } catch (error) {
            console.error('Strava API error:', error);
            return res.status(500).json({ message: error.message });
        }
    }

    // Hvis metoden ikke er OPTIONS, GET eller POST
    return res.status(405).json({ message: 'Method Not Allowed' });
}