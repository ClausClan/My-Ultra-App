// planManager.js - FULD DATABASE-DREVET VERSION

let activePlan = [];
let activePlanName = '';

// Funktion til at gemme den aktive plan i databasen
async function saveActivePlan(planName, planData) {
    try {
        const response = await fetch('/api/save-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planName, planData })
        });
        if (!response.ok) throw new Error('Kunne ikke gemme planen');
        console.log("Plan gemt i databasen.");
        activePlan = planData; // Opdater den lokale kopi
        activePlanName = planName;
    } catch (error) {
        console.error("Fejl ved at gemme plan:", error);
        alert("Der opstod en fejl. Kunne ikke gemme planen.");
    }
}

// Funktion til at hente den aktive plan fra databasen
async function loadActivePlan() {
    try {
        const response = await fetch('/api/get-plan');
        if (!response.ok) {
            if (response.status === 404 || response.status === 204) {
                 console.log("Ingen aktiv plan fundet i databasen.");
                 return;
            }
            throw new Error('Kunne ikke hente plan');
        }
        const planObject = await response.json();
        if (planObject && planObject.plan_data) {
            activePlan = planObject.plan_data;
            activePlanName = planObject.plan_name;
            console.log(`Planen "${activePlanName}" er hentet fra databasen.`);
        }
    } catch (error) {
        console.error("Fejl ved hentning af plan:", error);
    }
}

// Initialiserer Plan-siden
export function initializePlanPage() {
    const triggerButton = document.getElementById('trigger-plan-import-btn');
    const fileInput = document.getElementById('plan-file-input'); // Hedder 'plan-file-input' i HTML

    // Lyt efter klik på den SYNLIGE knap
    triggerButton?.addEventListener('click', () => {
        fileInput?.click(); // "Klik" på det usynlige input-felt for at åbne fil-vælgeren
    });

    // Lyt efter at en fil er blevet valgt i fil-vælgeren
    fileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const planData = JSON.parse(e.target.result);
                await saveActivePlan(file.name, planData);
                alert('Træningsplanen blev importeret og gemt i databasen. Siden genindlæses.');
                location.reload();
            } catch (error) {
                console.error("Fejl ved import af plan:", error);
                alert("Ugyldig planfil.");
            }
        };
        reader.readAsText(file);
    });

    // 'reset-plan-btn' logikken forbliver den samme
    document.getElementById('reset-plan-btn')?.addEventListener('click', async () => {
        if (confirm("Er du sikker på, at du vil slette den aktive plan?")) {
            await saveActivePlan('Ingen plan', []);
            location.reload();
        }
    });

    // Kald loadActivePlan ved initialisering
    loadActivePlan().then(() => {
        // ... (din UI-opdateringskode for Plan-siden) ...
    });
}

// Giver andre moduler adgang til den aktive plan
export function getActivePlan() {
    return activePlan;
}