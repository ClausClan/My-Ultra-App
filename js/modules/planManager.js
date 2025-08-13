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
    document.getElementById('plan-import-btn')?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const planData = JSON.parse(e.target.result);
                // Efter import, gem planen direkte i databasen
                await saveActivePlan(file.name, planData);
                location.reload(); // Genindlæs for at vise den nye plan overalt
            } catch (error) {
                alert("Ugyldig planfil.");
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('reset-plan-btn')?.addEventListener('click', async () => {
        if (confirm("Er du sikker på, at du vil slette den aktive plan?")) {
            // Slet planen ved at gemme en tom plan
            await saveActivePlan('Ingen plan', []);
            location.reload();
        }
    });

    // Kald loadActivePlan ved initialisering, så planen er klar
    loadActivePlan().then(() => {
        // Opdater UI på Plan-siden (denne del kan udbygges)
        // f.eks. visning af grafer og ugeoversigt...
    });
}

// Giver andre moduler adgang til den aktive plan
export function getActivePlan() {
    return activePlan;
}