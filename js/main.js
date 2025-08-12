// main.js - FULDT RETTET VERSION (12. AUGUST 2025)

import { initializeCalendar } from './modules/calendarManager.js';
import { updateHomePageDashboard } from './modules/chartManager.js';
import { initializePlanPage, getActivePlan } from './modules/planManager.js';
import { initializeAnalysePage } from './modules/analyseManager.js';
import { initializeStravaConnection } from './modules/stravaManager.js';

// --- PROFIL-FUNKTIONER (DATABASE-DREVET) ---

// Funktion til at hente profildata fra databasen og udfylde formularen
async function loadProfileData() {
    try {
        const response = await fetch('/api/get-profile');
        if (!response.ok) {
            if (response.status === 404 || response.status === 204) return;
            throw new Error('Serverfejl ved hentning af profil');
        }
        
        const profileData = await response.json();
        if (!profileData) return;
        
        // Udfyld de "normale" data-felter
        document.querySelectorAll('#loberdata .data-input').forEach(input => {
            if (profileData[input.id]) {
                input.value = profileData[input.id];
            }
        });

        // NYT: Udfyld zone-data fra arrays
        const zoneTypes = { hr: 'hr_zones', power: 'power_zones', pace: 'pace_zones' };
        for (const prefix in zoneTypes) {
            const arrayKey = zoneTypes[prefix];
            if (profileData[arrayKey] && Array.isArray(profileData[arrayKey])) {
                profileData[arrayKey].forEach((value, index) => {
                    const input = document.getElementById(`${prefix}Zone${index + 1}`);
                    if (input) {
                        input.value = value || '';
                    }
                });
            }
        }
        
        personalizeDashboard(profileData.runnerName);
        initializeProfilePageCalculations();
    } catch (error) {
        console.error("Fejl ved indlæsning af profil:", error);
    }
}

// Funktion til at håndtere alder og profilbillede (uden save/load)
function initializeProfilePageCalculations() {
    const runnerDobInput = document.getElementById('runnerDob');
    const calculatedAgeEl = document.getElementById('calculatedAge');
    
    const calculateAge = (dobString) => {
        if (!dobString) return '-';
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    
    runnerDobInput?.addEventListener('input', () => {
        calculatedAgeEl.textContent = calculateAge(runnerDobInput.value);
    });

    // Kør en gang ved start for at vise den alder, der er loadet fra databasen
    if (runnerDobInput.value) {
         calculatedAgeEl.textContent = calculateAge(runnerDobInput.value);
    }
}

// Opdaterer dashboard med navn
function personalizeDashboard(name) {
    const nameEl = document.getElementById('dashboard-runner-name');
    if (nameEl && name) {
        nameEl.textContent = `Velkommen, ${name}`;
    } else if (nameEl) {
        nameEl.textContent = `Min Løberprofil`;
    }
    // Profilbillede-logik kan tilføjes her senere, hvis det skal gemmes i databasen
}

// Opdaterer status på forsiden
function updateHomepageStatus() {
    const planStatusText = document.getElementById('planStatusText');
    const todayTrainingText = document.getElementById('todayTrainingText');
    const activePlan = getActivePlan();

    if (activePlan && activePlan.length > 0) {
        planStatusText.textContent = `Aktiv plan er indlæst. God træning!`;
        const today = new Date().toISOString().split('T')[0];
        const todaysTraining = activePlan.find(day => day.date === today);
        todayTrainingText.textContent = todaysTraining ? todaysTraining.plan : 'Ingen træning planlagt i dag.';
    } else {
        planStatusText.textContent = 'Ingen aktiv plan. Importer en plan for at komme i gang.';
        todayTrainingText.textContent = 'Ingen træning planlagt i dag.';
    }
}

// --- APPENS "MOTOR" - STARTER NÅR SIDEN ER KLAR ---
document.addEventListener('DOMContentLoaded', function() {
    
    // --- NAVIGATION (VIGTIGT AT DENNE ER HER!) ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            button.classList.add('active');
            const pageId = button.dataset.page;
            document.getElementById(pageId).classList.add('active');

            if (pageId === 'hjem') {
                updateHomePageDashboard();
                updateHomepageStatus();
                // Navnet på dashboardet bliver opdateret, når profilen er hentet
            }
        });
    });

    // --- GEM PROFIL KNAP (DATABASE-DREVET) ---
    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    const saveButton = document.getElementById('saveProfileBtn');
    saveButton.textContent = "Gemmer...";
    saveButton.disabled = true;

    const profileData = {};
    // Indsaml alle de "normale" data-felter
    document.querySelectorAll('#loberdata .data-input').forEach(input => {
        if (input.value) profileData[input.id] = input.value;
    });

    // NYT: Indsaml zone-data og byg arrays
    const zoneTypes = { hr: 'hr_zones', power: 'power_zones', pace: 'pace_zones' };
    for (const prefix in zoneTypes) {
        const arrayKey = zoneTypes[prefix];
        profileData[arrayKey] = [];
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`${prefix}Zone${i}`);
            if (input) {
                profileData[arrayKey].push(input.value || null);
            }
        }
    }

    try {
        const response = await fetch('/api/save-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        if (!response.ok) throw new Error("Serveren kunne ikke gemme profilen.");
        saveButton.textContent = "Profil Gemt!";
    } catch (error) {
        console.error("Fejl ved at gemme profil:", error);
        saveButton.textContent = "Fejl - Prøv Igen";
    } finally {
        setTimeout(() => {
            saveButton.textContent = "Gem Profil i Database";
            saveButton.disabled = false;
        }, 2000);
    }
});

// 2. NYT: Eksporterer den aktuelle profil til en .json-fil
    document.getElementById('exportProfileBtn')?.addEventListener('click', () => {
        const profileData = {};
        const allDataInputs = document.querySelectorAll('#loberdata .data-input');
        allDataInputs.forEach(input => {
            profileData[input.id] = input.value;
        });

        const dataStr = JSON.stringify(profileData, null, 2);
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const link = document.createElement('a');
        link.download = 'min_ultra_app_profil.json';
        link.href = URL.createObjectURL(dataBlob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });

    // 3. NYT: Starter import-processen ved at åbne fil-vælgeren
    const loadProfileBtn = document.getElementById('loadProfileBtn');
    const profileFileInput = document.getElementById('profileFileInput');
    loadProfileBtn?.addEventListener('click', () => profileFileInput.click());

    // 4. NYT: Håndterer den valgte fil, når den er blevet importeret
    profileFileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Udfyld formularen med de importerede data
                const allDataInputs = document.querySelectorAll('#loberdata .data-input');
                allDataInputs.forEach(input => {
                    if (importedData[input.id]) {
                        input.value = importedData[input.id];
                    }
                });
                
                // Opdater UI (f.eks. beregn alder igen)
                initializeProfilePageCalculations();
                alert('Profilen er indlæst i formularen. Tryk på "Gem Profil i Database" for at gemme ændringerne permanent.');

            } catch (error) {
                console.error("Fejl ved indlæsning af profilfil:", error);
                alert("Ugyldig profilfil. Vælg venligst en korrekt formateret .json fil.");
            }
        };
        reader.readAsText(file);
    });

    // --- INITIALISER ALLE MODULER OG SIDER ---
    // Rækkefølgen her kan være vigtig
    initializeCalendar(); // Kalender skal starte, da den henter data
    loadProfileData(); // Hent profildata fra databasen
    updateHomePageDashboard();
    initializePlanPage();
    initializeProfilePageCalculations(); // Opsæt alder-beregner osv.
    updateHomepageStatus();
    initializeAnalysePage();
    initializeStravaConnection();
});