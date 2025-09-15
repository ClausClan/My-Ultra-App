// Fil: /api/strava.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Helper-funktion til Strava's token endpoint
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
    // --- Håndter GET-anmodning (erstatter strava-config.js) ---
    if (req.method === 'GET') {
        const stravaClientId = process.env.STRAVA_CLIENT_ID;
        if (!stravaClientId) {
            return res.status(500).json({ error: 'Strava Client ID is not configured.' });
        }
        return res.status(200).json({ clientId: stravaClientId });
    }

    // --- Håndter POST-anmodninger ---
    if (req.method === 'POST') {
        const client_id = process.env.STRAVA_CLIENT_ID;
        const client_secret = process.env.STRAVA_CLIENT_SECRET;

        try {
            if (req.body.code && req.body.redirect_uri) {
                // RETTET: Bruger nu redirect_uri fra anmodningen
                const { code, redirect_uri } = req.body;
                const payload = { client_id, client_secret, code, grant_type: 'authorization_code', redirect_uri };
                const data = await fetchStravaTokens(payload);
                return res.status(200).json(data);
            }

            if (req.body.refresh_token) {
                // ... (refresh-delen er uændret)
            }
            return res.status(400).json({ message: 'Invalid POST request.' });
        } catch (error) { /* ... */ }
    }
    return res.status(405).json({ message: 'Method Not Allowed' });
}