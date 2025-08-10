export default async function handler(req, res) {
  // Sørg for at vi kun accepterer POST-kald
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const userPrompt = req.body.prompt;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }]
  };

  try {
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.json();
      throw new Error(errorBody.error.message);
    }

    const data = await apiResponse.json();
    res.status(200).json(data); // Send Gemini's svar tilbage

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: error.message });
  }
}