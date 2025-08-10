export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is missing' });
  }

  const client_id = process.env.STRAVA_CLIENT_ID;
  const client_secret = process.env.STRAVA_CLIENT_SECRET;
  const grant_type = 'authorization_code';

  const stravaUrl = 'https://www.strava.com/oauth/token';

  try {
    const response = await fetch(stravaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
        grant_type,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error from Strava: ${errorData.message}`);
    }

    const data = await response.json();
    
    // Send de modtagne tokens tilbage til frontenden
    res.status(200).json(data);

  } catch (error) {
    console.error('Strava auth error:', error);
    res.status(500).json({ message: error.message });
  }
}