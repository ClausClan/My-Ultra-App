// planManager.js - FULD DATABASE-DREVET VERSION INKL. VISNING

let activePlan = [];
let activePlanName = '';

// --- DATAHÅNDTERING (Kommunikerer med backenden) ---

async function saveActivePlan(planName, planData) {
    try {
        const response = await fetch('/api/save-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planName, planData })
        });
        if (!response.ok) throw new Error('Kunne ikke gemme planen');
        console.log("Plan gemt i databasen.");
        activePlan = planData;
        activePlanName = planName;
    } catch (error) {
        console.error("Fejl ved at gemme plan:", error);
        alert("Der opstod en fejl. Kunne ikke gemme planen.");
    }
}

// NY: Eksporteres så main.js kan kalde den ved opstart
export async function loadActivePlan() {
    try {
        const response = await fetch('/api/get-plan');
        if (response.status === 204 || response.status === 404) {
            console.log("Ingen aktiv plan fundet i databasen.");
            activePlan = [];
            activePlanName = '';
            return;
        }
        if (!response.ok) throw new Error('Kunne ikke hente plan');
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

// --- VISNING AF PLAN-SIDEN ---

// Denne funktion tegner alt på selve Plan-siden
function renderPlanPage() {
    const titleElement = document.getElementById('weekly-overview-title');
    const detailsView = document.getElementById('plan-details-view');
    // Her kan du tilføje logik til at tegne grafer, f.eks. planTimelineChart

    if (activePlan && activePlan.length > 0) {
        if(titleElement) titleElement.textContent = `Aktiv plan: ${activePlanName}`;
        
        let detailsHtml = '';
        activePlan.forEach(day => {
            detailsHtml += `<div class="day-row"><strong>${day.date} (${day.day}):</strong> <span>${day.plan}</span></div>`;
        });
        if(detailsView) detailsView.innerHTML = detailsHtml;

    } else {
        if(titleElement) titleElement.textContent = 'Ingen aktiv plan';
        if(detailsView) detailsView.innerHTML = '<p class="text-center text-gray-500">Importer en plan for at starte.</p>';
    }
}


// --- INITIALISERING ---

export function initializePlanPage() {
    const triggerButton = document.getElementById('trigger-plan-import-btn');
    const fileInput = document.getElementById('plan-file-input');
    
    triggerButton?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const planData = JSON.parse(e.target.result);
                await saveActivePlan(file.name, planData);
                alert('Træningsplanen blev importeret og gemt. Siden genindlæses.');
                location.reload();
            } catch (error) {
                alert("Ugyldig planfil.");
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('reset-plan-btn')?.addEventListener('click', async () => {
        if (confirm("Er du sikker på, at du vil slette den aktive plan?")) {
            await saveActivePlan('Ingen plan', []);
            location.reload();
        }
    });

    // Når siden indlæses, tegn den plan, der allerede er hentet
    renderPlanPage();
}

// Giver andre moduler adgang til den hentede plan
export function getActivePlan() {
    return activePlan;
}