import express from 'express';
import cors from 'cors';

// Opret en Express app
const app = express();
const port = process.env.PORT || 8080;

// Middleware til at håndtere JSON og tillade kald fra din frontend
app.use(cors());
app.use(express.json());

// Vores første API endpoint
app.post('/api/generate-plan', async (req, res) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    // 'req.body.prompt' vil indeholde den prompt, vi sender fra planGenerator.js
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
        res.json(data); // Send Gemini's svar tilbage til frontenden

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start serveren
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});