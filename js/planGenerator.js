// planGenerator.js - FULD VERSION MED "BRING YOUR OWN KEY" OG FALLBACK (20. AUGUST 2025)

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencer til alle HTML-elementer ---
    const form = document.getElementById('plan-form');
    const apiKeyInput = document.getElementById('gemini-api-key');
    const modelSelect = document.getElementById('ai-model-select');
    const fetchProfileBtn = document.getElementById('fetch-profile-btn');
    const experienceTextarea = document.getElementById('experience');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const goalsContainer = document.getElementById('goals-container');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const statusMessage = document.getElementById('statusMessage');
    let goalCounter = 0;

    // --- LOGIK FOR API-NØGLE ---
    // Henter/gemmer nøglen i sessionStorage, så den huskes ved reload, men forsvinder når fanen lukkes.
    if (apiKeyInput) {
        apiKeyInput.value = sessionStorage.getItem('userGeminiApiKey') || '';
        apiKeyInput.addEventListener('input', () => {
            sessionStorage.setItem('userGeminiApiKey', apiKeyInput.value);
        });
    }

    // --- LOGIK FOR "HENT PROFIL" ---
    async function loadProfileForGenerator() {
        if (fetchProfileBtn) {
            fetchProfileBtn.textContent = 'Henter...';
            fetchProfileBtn.disabled = true;
        }
        try {
            const response = await fetch('/api/get-profile');
            if (!response.ok) {
                if (response.status === 404 || response.status === 204) {
                    console.log("Ingen profil fundet. Udfyld venligst manuelt.");
                } else { throw new Error('Kunne ikke hente profil fra serveren.'); }
                return;
            }
            const profileData = await response.json();
            if (profileData && profileData.runnerExperience) {
                experienceTextarea.value = profileData.runnerExperience;
            }
        } catch (error) {
            console.error("Fejl ved hentning af profil:", error);
            alert("Der opstod en fejl under hentning af din løberprofil.");
        } finally {
            if (fetchProfileBtn) {
                fetchProfileBtn.textContent = 'Hent min Løberprofil';
                fetchProfileBtn.disabled = false;
            }
        }
    }
    fetchProfileBtn?.addEventListener('click', loadProfileForGenerator);

    // --- LOGIK FOR MÅL-SEKTIONEN ---
    function addGoalRow() {
        goalCounter++;
        const goalRow = document.createElement('div');
        goalRow.className = 'goal-row';
        goalRow.innerHTML = `
            <button type="button" class="remove-goal-btn" title="Fjern mål">×</button>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label for="goalType-${goalCounter}" class="block font-medium text-sm">Type Mål</label><select id="goalType-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"><option>A-Mål (Hovedløb)</option><option>B-Mål (Vigtigt testløb)</option><option>C-Mål (Træningsløb)</option></select></div>
                <div class="md:col-span-2"><label for="raceName-${goalCounter}" class="block font-medium text-sm">Navn på løb</label><input type="text" id="raceName-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                <div><label for="raceDate-${goalCounter}" class="block font-medium text-sm">Dato</label><input type="date" id="raceDate-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                <div><label for="distance-${goalCounter}" class="block font-medium text-sm">Distance (km)</label><input type="number" id="distance-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                <div><label for="elevation-${goalCounter}" class="block font-medium text-sm">Højdemeter</label><input type="number" id="elevation-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
            </div>
            <div class="mt-4"><label for="raceGoal-${goalCounter}" class="block font-medium text-sm">Mål for dette løb</label><textarea id="raceGoal-${goalCounter}" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="F.eks. 'Gennemføre under 12 timer'"></textarea></div>`;
        goalRow.querySelector('.remove-goal-btn').addEventListener('click', () => goalRow.remove());
        goalsContainer.appendChild(goalRow);
    }
    addGoalBtn?.addEventListener('click', addGoalRow);
    addGoalRow();

    // --- HOVEDLOGIK: Når formularen submittes ---
    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        statusMessage.textContent = '';
        loadingSpinner.style.display = 'block';

        const userApiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;
        
        const runnerInfo = { experience: experienceTextarea.value, trainingDaysPerWeek: document.getElementById('planTrainingDaysPerWeek').value };
        const goals = Array.from(document.querySelectorAll('.goal-row')).map(row => {
            const id = row.querySelector('select').id.split('-')[1];
            return { type: row.querySelector(`#goalType-${id}`).value, name: row.querySelector(`#raceName-${id}`).value, date: row.querySelector(`#raceDate-${id}`).value, distance: row.querySelector(`#distance-${id}`).value, elevation: row.querySelector(`#elevation-${id}`).value, goal: row.querySelector(`#raceGoal-${id}`).value };
        });
        
        let rawResponseText = '';
        try {
            statusMessage.textContent = `Genererer plan med ${selectedModel}...`;
            const prompt = buildAdvancedPrompt(runnerInfo, goals);

            if (userApiKey) {
                console.log("Bruger personlig API nøgle (Client-side kald)");
                rawResponseText = await callGeminiClientSide(prompt, userApiKey, selectedModel);
            } else {
                console.log("Bruger appens indbyggede nøgle (Backend-kald)");
                rawResponseText = await callGeminiBackend(prompt);
            }
            
            const validPlan = safeParseJson(rawResponseText);
            const planAsText = JSON.stringify(validPlan, null, 2);
            downloadJSON(planAsText, `traeningsplan.json`);
            
            statusMessage.textContent = `Planen er genereret!`;
            statusMessage.style.color = 'green';

        } catch (error) {
            statusMessage.innerHTML = `<strong>Der opstod en fejl:</strong><br>${error.message}`;
            statusMessage.style.color = 'red';
            console.error("Fejl under generering:", error);
            console.log("--- AI RÅ SVAR ---", rawResponseText);
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });

    // KØR PROFIL-HENT AUTOMATISK, NÅR SIDEN ER KLAR
    loadProfileForGenerator();
});


// --- HJÆLPEFUNKTIONER ---

async function callGeminiClientSide(prompt, apiKey, model) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { "response_mime_type": "application/json" },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`API fejl: ${result?.error?.message || 'Ukendt fejl'}`);
    if (result.candidates?.[0]) return result.candidates[0].content.parts[0].text;
    throw new Error("Intet svar fra AI. Det kan være blokeret.");
}

async function callGeminiBackend(prompt) {
    const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
    });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Fejl fra server: ${errorBody.error || JSON.stringify(errorBody)}`);
    }
    const result = await response.json();
    if (result.candidates?.[0]) return result.candidates[0].content.parts[0].text;
    throw new Error("Intet svar fra AI via backend.");
}

function buildAdvancedPrompt(runnerInfo, goals) {
    let goalsString = goals.map(g => `- Goal Type: ${g.type}\n  Race Name: ${g.name}\n  Date: ${g.date}\n  Distance: ${g.distance}km\n  Elevation: ${g.elevation}m\n  Specific Goal: ${g.goal}`).join('\n');
    const runnerProfile = `- Runner Experience: ${runnerInfo.experience}\n- Desired Training Days Per Week: ${runnerInfo.trainingDaysPerWeek}`;
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const startDate = today.toISOString().split('T')[0];
    const finalGoal = goals.reduce((latest, goal) => (new Date(goal.date) > new Date(latest.date) ? goal : latest), goals[0]);
    return `You are a world-class ultrarunning coach. Your task is to create a scientifically-backed training plan based on the user's profile and goals.
The output MUST be a valid JSON array of objects. Do not output anything else.
**Your Core Principles:**
1.  **Polarized Training (80/20 Rule)**
2.  **Specificity**
3.  **Periodization**
4.  **Progressive Overload**
5.  **Functional Strength**
6.  **Use the following running workout types: endurance, steady-state, tempo, fartleg and VO2max runs**
**Runner's Information:**
${runnerProfile}
**List of Goals:**
${goalsString}
**JSON Object Structure:**
{
  "date": "YYYY-MM-DD",
  "week": 0,
  "day": "Mandag",
  "plan": "Description of the day's training using RPE for intensity.",
  "isRestDay": false,
  "isRaceDay": false
}
**Generation Rules:**
- The plan must start on ${startDate} and cover the entire period up to and including the final A-Goal on ${finalGoal.date}.
- \`week\`: The ISO 8601 week number.
- \`day\`: The Danish name for the day of the week.
- \`plan\`: Clear training description using RPE. For goals, state goal type, e.g., "A-Mål: [Race Name]".
- \`isRestDay\`: \`true\` for rest/active recovery.
- \`isRaceDay\`: \`true\` for goal days.
- **CRITICAL RULE:** The string value for the "plan" key must NOT contain unescaped double-quote (") characters.
Generate the complete JSON plan now.`;
}

function safeParseJson(jsonString) {
    try {
        const startIndex = jsonString.indexOf('[');
        const endIndex = jsonString.lastIndexOf(']');
        if (startIndex === -1 || endIndex === -1) {
            throw new Error("Kunne ikke finde et JSON-array i AI-svaret.");
        }
        const jsonArrayString = jsonString.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonArrayString);
    } catch (e) {
        throw new Error("Kunne ikke parse JSON fra AI-svar. Prøv igen.");
    }
}

function downloadJSON(jsonString, filename) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}