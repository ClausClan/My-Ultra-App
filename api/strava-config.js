export default function handler(req, res) {
  // Vi sender KUN den offentlige client_id, aldrig client_secret.
  const stravaClientId = process.env.STRAVA_CLIENT_ID;

  if (!stravaClientId) {
    return res.status(500).json({ error: 'Strava Client ID is not configured on the server.' });
  }

  res.status(200).json({ clientId: stravaClientId });
}