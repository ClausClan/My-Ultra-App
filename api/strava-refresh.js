// Fil: /api/strava-refresh.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ message: 'Refresh token is missing' });
  }

  const client_id = process.env.STRAVA_CLIENT_ID;
  const client_secret = process.env.STRAVA_CLIENT_SECRET;
  
  const stravaUrl = 'https://www.strava.com/oauth/token';

  try {
    const response = await fetch(stravaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id,
        client_secret,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error from Strava: ${errorData.message}`);
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Strava refresh token error:', error);
    res.status(500).json({ message: error.message });
  }
}