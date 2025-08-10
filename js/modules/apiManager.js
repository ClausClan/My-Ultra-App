import { GEMINI_API_KEY } from './config.js'; // Importer nøglen

export function initializeApi(plan) {
    const weeklySummaryBtn = document.getElementById('weeklySummaryBtn');
    const raceAdviceBtn = document.getElementById('raceAdviceBtn');
    
    weeklySummaryBtn.addEventListener('click', () => handleWeeklySummary(plan));
    raceAdviceBtn.addEventListener('click', () => handleRaceAdvice(plan));
}

async function callGemini(prompt) {
    const apiKey = GEMINI_API_KEY; // Brug nøglen fra config-filen
    if (!apiKey || apiKey === 'DIN_API_NØGLE_HER') {
        return "Fejl: Indsæt venligst din Gemini API nøgle i filen js/modules/config.js.";
    }
    
    const aiLoadingSpinner = document.getElementById('aiLoadingSpinner');
    const aiResultContainer = document.getElementById('ai-result-container');
    
    aiLoadingSpinner.style.display = 'block';
    aiResultContainer.style.display = 'none';

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API fejl: ${response.status} - ${errorBody.error.message}`);
        }
        const result = await response.json();
        if (result.candidates && result.candidates.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            return "Intet svar modtaget fra AI. Tjek din API nøgle og prøv igen.";
        }
    } catch (error) {
        console.error("Fejl ved kald til Gemini API:", error);
        return `Der opstod en fejl: ${error.message}`;
    } finally {
        aiLoadingSpinner.style.display = 'none';
    }
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function handleWeeklySummary(plan) {
    const aiResultContainer = document.getElementById('ai-result-container');
    const today = new Date();
    const lastWeekNumber = getWeekNumber(new Date(today.setDate(today.getDate() - 7)));
    
    let weeklyNotes = `Data for uge ${lastWeekNumber}:\n`;
    let weekFound = false;
    plan.forEach(item => {
        if (getWeekNumber(new Date(item.date)) === lastWeekNumber) {
            weekFound = true;
            weeklyNotes += `\n**${item.day} (${item.date}):**\n`;
            weeklyNotes += `  - Plan: ${item.plan}\n`;
            const hrv = localStorage.getItem(`hrv-${item.date}`) || 'N/A';
            const sleep = localStorage.getItem(`sleep-${item.date}`) || 'N/A';
            const pte = localStorage.getItem(`pte-${item.date}`) || 'N/A';
            const vo2max = localStorage.getItem(`vo2max-${item.date}`) || 'N/A';
            const notes = localStorage.getItem(`notes-${item.date}`) || 'Ingen noter.';
            weeklyNotes += `  - HRV: ${hrv}, Søvn: ${sleep}, PTE: ${pte}, VO2max: ${vo2max}\n`;
            weeklyNotes += `  - Noter: ${notes}\n`;
        }
    });

    if (!weekFound) {
        aiResultContainer.textContent = "Ingen data fundet for sidste uge.";
        aiResultContainer.style.display = 'block';
        return;
    }

    const prompt = `You are an expert ultrarunning coach analyzing a runner's training data. Provide a concise, encouraging, and insightful summary IN DANISH based on the following data for the last week. Highlight positive trends (like rising HRV or VO2max), identify areas for improvement, and give one concrete tip for the upcoming week.

    Data:
    ${weeklyNotes}`;

    const result = await callGemini(prompt);
    aiResultContainer.textContent = result;
    aiResultContainer.style.display = 'block';
}

async function handleRaceAdvice(plan) {
    const aiResultContainer = document.getElementById('ai-result-container');
    const raceDay = plan.find(d => d.isRaceDay);
    if (!raceDay) {
        aiResultContainer.textContent = "Ingen løbsdag fundet i planen.";
        aiResultContainer.style.display = 'block';
        return;
    }

    let fullTrainingLog = "Resumé af træningsblok:\n";
    plan.forEach(item => {
        if (item.isRaceDay) return;
        const notes = localStorage.getItem(`notes-${item.date}`);
        if (notes) {
            fullTrainingLog += `- Note fra ${item.date}: ${notes}\n`;
        }
    });
    
    const prompt = `You are an expert ultrarunning coach. A runner is asking for advice for their upcoming race. Based on their race details and their training log notes, provide a personalized race day strategy IN DANISH. The advice should cover:
    1.  Pacing strategy (e.g., start conservative, how to handle hills).
    2.  Nutrition and hydration strategy (reminders on when to eat/drink).
    3.  Mental preparation and key focus points.

    Race Details: ${raceDay.plan}
    
    Runner's Notes from training:
    ${fullTrainingLog}`;

    const result = await callGemini(prompt);
    aiResultContainer.textContent = result;
    aiResultContainer.style.display = 'block';
}
