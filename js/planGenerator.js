// planGenerator.js// planGenerator.js - FULD VERSION MED LIVE PROMPT PREVIEW (21. AUGUST 2025)

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencer til alle elementer ---
    const form = document.getElementById('plan-form');
    const apiKeyInput = document.getElementById('gemini-api-key');
    const fetchProfileBtn = document.getElementById('fetch-profile-btn');
    const experienceTextarea = document.getElementById('experience');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const goalsContainer = document.getElementById('goals-container');
    const togglePromptSwitch = document.getElementById('toggle-prompt-view');
    const formContainer = document.getElementById('form-container');
    const promptContainer = document.getElementById('prompt-preview-container');
    const promptContent = document.getElementById('prompt-preview-content');
    const copyPromptBtn = document.getElementById('copy-prompt-btn');
    let goalCounter = 0;

    // --- FUNKTION: Opdaterer prompt-preview ---
    function updatePromptPreview() {
        if (promptContainer && !promptContainer.classList.contains('hidden')) {
            const runnerInfo = {
                experience: experienceTextarea.value,
                trainingDaysPerWeek: document.getElementById('planTrainingDaysPerWeek').value
            };
            const goals = Array.from(document.querySelectorAll('.goal-row')).map(row => {
                const id = row.querySelector('select').id.split('-')[1];
                // OPDATERET: Tilføjet gpxFileName
                return {
                    type: row.querySelector(`#goalType-${id}`).value,
                    name: row.querySelector(`#raceName-${id}`).value,
                    date: row.querySelector(`#raceDate-${id}`).value,
                    distance: row.querySelector(`#distance-${id}`).value,
                    elevation: row.querySelector(`#elevation-${id}`).value,
                    goal: row.querySelector(`#raceGoal-${id}`).value,
                    gpxFileName: row.querySelector(`#gpxFile-${id}`).files[0] ? row.querySelector(`#gpxFile-${id}`).files[0].name : 'N/A'
                };
            });
            promptContent.textContent = buildAdvancedPrompt(runnerInfo, goals);
        }
    }

// --- LOGIK FOR KNAPPER OG OPSTART ---
    
    // Tænd/Sluk slider for prompt-vinduet
    togglePromptSwitch.addEventListener('change', () => {
        const isVisible = togglePromptSwitch.checked;
        promptContainer.classList.toggle('hidden', !isVisible);
        formContainer.classList.toggle('lg:col-span-3', !isVisible);
        formContainer.classList.toggle('lg:col-span-2', isVisible);
        if (isVisible) {
            updatePromptPreview();
        }
    });

    // Kopiér prompt
    copyPromptBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(promptContent.textContent).then(() => {
            copyPromptBtn.textContent = 'Kopieret!';
            setTimeout(() => { copyPromptBtn.textContent = 'Kopiér'; }, 2000);
        });
    });

    // Lyt efter ÆNDRINGER i hele formen for at opdatere prompten live
    form?.addEventListener('input', updatePromptPreview);

    // Gem/hent API-nøgle (uændret)
    apiKeyInput.value = sessionStorage.getItem('userGeminiApiKey') || '';
    apiKeyInput.addEventListener('input', () => sessionStorage.setItem('userGeminiApiKey', apiKeyInput.value));


    // Hent profil-logik
    async function loadProfileForGenerator() {
        if (!fetchProfileBtn) return;
        fetchProfileBtn.textContent = 'Henter...';
        fetchProfileBtn.disabled = true;
        try {
            const response = await fetch('/api/get-profile');
            if (response.ok) {
                const profileData = await response.json();
                if (profileData && profileData.runnerExperience) {
                    experienceTextarea.value = profileData.runnerExperience;
                    updatePromptPreview(); // Opdater prompten med de hentede data
                }
            }
        } catch (error) {
            console.error("Fejl ved hentning af profil:", error);
        } finally {
            fetchProfileBtn.textContent = 'Hent min Løberprofil';
            fetchProfileBtn.disabled = false;
        }
    }
    fetchProfileBtn?.addEventListener('click', loadProfileForGenerator);

    // Tilføj mål-logik
    function addGoalRow() {
        goalCounter++;
        const goalRow = document.createElement('div');
        goalRow.className = 'goal-row';
        // OPDATERET HTML: Tilføjet sektion for GPX-upload
        goalRow.innerHTML = `
            <button type="button" class="remove-goal-btn" title="Fjern mål">×</button>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label for="goalType-${goalCounter}" class="block font-medium text-sm">Type Mål</label><select id="goalType-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"><option>A-Mål (Hovedløb)</option><option>B-Mål (Vigtigt testløb)</option><option>C-Mål (Træningsløb)</option></select></div>
                <div class="md:col-span-2"><label for="raceName-${goalCounter}" class="block font-medium text-sm">Navn på løb</label><input type="text" id="raceName-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" required></div>
                <div><label for="raceDate-${goalCounter}" class="block font-medium text-sm">Dato</label><input type="date" id="raceDate-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" required></div>
                <div><label for="distance-${goalCounter}" class="block font-medium text-sm">Distance (km)</label><input type="number" id="distance-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" required></div>
                <div><label for="elevation-${goalCounter}" class="block font-medium text-sm">Højdemeter</label><input type="number" id="elevation-${goalCounter}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" required></div>
            </div>
            <div class="mt-4"><label for="raceGoal-${goalCounter}" class="block font-medium text-sm">Mål for dette løb</label><textarea id="raceGoal-${goalCounter}" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" placeholder="F.eks. 'Gennemføre under 12 timer'"></textarea></div>
            
            <div class="mt-4">
                <label for="gpxFile-${goalCounter}" class="gpx-upload-btn">Upload GPX (Valgfrit)</label>
                <input type="file" id="gpxFile-${goalCounter}" class="hidden" accept=".gpx">
                <span id="gpxFileName-${goalCounter}" class="ml-2 text-sm text-gray-500"></span>
            </div>
        `;

        // NY LOGIK: Forbinder den synlige knap med det skjulte input-felt
        goalRow.querySelector(`label[for='gpxFile-${goalCounter}']`).addEventListener('click', () => {
            goalRow.querySelector(`#gpxFile-${goalCounter}`).click();
        });
        goalRow.querySelector(`#gpxFile-${goalCounter}`).addEventListener('change', (e) => {
            const fileName = e.target.files.length > 0 ? e.target.files[0].name : '';
            goalRow.querySelector(`#gpxFileName-${goalCounter}`).textContent = fileName;
        });

        goalRow.querySelector('.remove-goal-btn').addEventListener('click', () => {
            goalRow.remove();
            updatePromptPreview();
        });
        goalsContainer.appendChild(goalRow);
        updatePromptPreview();
    }
    addGoalBtn?.addEventListener('click', addGoalRow);
    addGoalRow();

    // HOVEDLOGIK: Når formularen submittes
    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        statusMessage.textContent = '';
        loadingSpinner.style.display = 'block';

        const userApiKey = apiKeyInput.value.trim();
        const selectedModel = document.getElementById('ai-model-select').value;
        const prompt = promptContent.textContent; // Brug den live-genererede prompt
        
        try {
            statusMessage.textContent = `Genererer plan med ${selectedModel}...`;

            let rawResponseText = '';
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
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });

    // KØR PROFIL-HENT AUTOMATISK
    loadProfileForGenerator();
});

// --- HJÆLPEFUNKTIONER ---
async function callGeminiClientSide(prompt, apiKey, model) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { "response_mime_type": "application/json" }, safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }] };
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(`API fejl: ${result?.error?.message || 'Ukendt fejl'}`);
    if (result.candidates?.[0]) return result.candidates[0].content.parts[0].text;
    throw new Error("Intet svar fra AI. Det kan være blokeret.");
}

async function callGeminiBackend(prompt) {
    const response = await fetch('/api/generate-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt }) });
    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Fejl fra server: ${errorBody.error || JSON.stringify(errorBody)}`);
    }
    const result = await response.json();
    if (result.candidates?.[0]) return result.candidates[0].content.parts[0].text;
    throw new Error("Intet svar fra AI via backend.");
}

function buildAdvancedPrompt(runnerInfo, goals) {
    const goalsString = goals.map(g => `- Mål: ${g.type}, Navn: ${g.name}, Dato: ${g.date}, Distance: ${g.distance}km, Højdemeter: ${g.elevation}m, GPX Fil: ${g.gpxFileName}, Specifikt mål: ${g.goal}`).join('\n');    const runnerProfile = `Erfaring: ${runnerInfo.experience}\nØnskede træningsdage/uge: ${runnerInfo.trainingDaysPerWeek}`;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const finalGoal = goals.length > 0 ? goals.reduce((latest, goal) => (new Date(goal.date) > new Date(latest.date) ? goal : latest), goals[0]) : { date: new Date().toISOString().split('T')[0] };
    // NYT: Beregn 5 uger efter sidste mål
    const postRaceEndDate = new Date(finalGoal.date);
    postRaceEndDate.setDate(postRaceEndDate.getDate() + 35); // 5 uger * 7 dage

    return `You are a world-class ultrarunning coach. Your task is to create a scientifically-backed training plan based on the user's profile and goals.
The output MUST be a valid JSON array of objects. Do not output anything else.

**Your Core Principles:**
1.  **Polarized Training (80/20 Rule)**
2.  **Specificity**
3.  **Periodization**
4.  **Progressive Overload**
5.  **Functional Strength**
6.  **Use the following running workout types: recovery, endurance, steady-state, tempo, fartleg, Interval, and VO2max runs**
7:  **Post-Race Recovery & Maintenance**

**Runner's Information:**
${runnerProfile}

**List of Goals:**
${goalsString}

**Workout Types to use:**
- For low intensity, use **"Endurance"** or **"Recovery"**.
- For moderate intensity, use **"Steady-state"** or **"Fartleg"**.
- For high intensity, use **"Tempo"**, **"Interval"**, or **"VO2max"**.
- Also include **"Strength"** sessions.
- For rest days, use **"Hvile"**.

**JSON Object Structure:**
{
  "date": "YYYY-MM-DD",
  "week": 0,
  "day": "Mandag",
  "plan": "Description of the day's training including one of the approved workout types and RPE for intensity.",
  "isRestDay": false,
  "isRaceDay": false
}

**Generation Rules:**
- The plan must start on ${startDate.toISOString().split('T')[0]} and cover the entire period up to and including the final goal on ${finalGoal.date}.
- \`week\`: The ISO 8601 week number.
- \`day\`: The Danish name for the day of the week.
- \`plan\`: Clear training description using RPE. For goals, state goal type, e.g., "A-Mål: [Race Name]".
- \`isRestDay\`: \`true\` for rest/active recovery.
- \`isRaceDay\`: \`true\` for goal days.
- **CRITICAL RULE:** The plan must extend for 5 weeks AFTER the final goal on ${finalGoal.date}, ending on or after ${postRaceEndDate.toISOString().split('T')[0]}. This post-race period should include a proper recovery phase followed by a maintenance training block.
- **CRITICAL RULE:** The string value for the "plan" key must NOT contain unescaped double-quote (") characters.

Generate the complete JSON plan now.`;
}

function safeParseJson(jsonString) {
    try {
        const startIndex = jsonString.indexOf('[');
        const endIndex = jsonString.lastIndexOf(']');
        if (startIndex === -1 || endIndex === -1) throw new Error("Kunne ikke finde et JSON-array i AI-svaret.");
        return JSON.parse(jsonString.substring(startIndex, endIndex + 1));
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