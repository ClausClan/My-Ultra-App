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
            // Tjek om det er en anmodning om at udveksle en auth-kode (erstatter strava-auth.js)
            if (req.body.code) {
                const payload = { client_id, client_secret, code: req.body.code, grant_type: 'authorization_code' };
                const data = await fetchStravaTokens(payload);
                return res.status(200).json(data);
            }

            // Tjek om det er en anmodning om at genopfriske et token (erstatter strava-refresh.js)
            if (req.body.refresh_token) {
                const payload = { client_id, client_secret, refresh_token: req.body.refresh_token, grant_type: 'refresh_token' };
                const data = await fetchStravaTokens(payload);
                return res.status(200).json(data);
            }

            // Hvis ingen af delene, er anmodningen ugyldig
            return res.status(400).json({ message: 'Invalid POST request. Missing "code" or "refresh_token".' });

        } catch (error) {
            console.error('Strava API error:', error);
            return res.status(500).json({ message: error.message });
        }
    }

    // Hvis metoden hverken er GET eller POST
    return res.status(405).json({ message: 'Method Not Allowed' });
}