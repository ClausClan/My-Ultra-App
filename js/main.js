// main.js - FULDSTÆNDIG RETTET VERSION TIL PROFIL-HÅNDTERING (12. AUGUST 2025)

import { initializeCalendar } from './modules/calendarManager.js';
import { updateHomePageDashboard } from './modules/chartManager.js';
import { initializePlanPage, getActivePlan } from './modules/planManager.js';
import { initializeAnalysePage } from './modules/analyseManager.js';
import { initializeStravaConnection } from './modules/stravaManager.js';

// --- NYE, CENTRALE HJÆLPEFUNKTIONER ---

/**
 * Samler ALLE data fra Løberdata-formularen og returnerer et rent JavaScript-objekt.
 * Bruges af både Gem og Eksporter.
 */
function collectProfileDataFromForm() {
    const profileData = {};
    // Indsaml alle de "normale" data-felter
    document.querySelectorAll('#loberdata .data-input').forEach(input => {
        if (input.value) profileData[input.id] = input.value;
    });

    // Indsaml zone-data og byg arrays
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
    return profileData;
}

/**
 * Tager et JavaScript-objekt med profildata og udfylder hele Løberdata-formularen.
 * Bruges af både Hent fra Database og Importer.
 * @param {object} profileData - Objektet med profildata.
 */
function populateFormWithProfileData(profileData) {
    if (!profileData) return;

    // Udfyld de "normale" data-felter
    document.querySelectorAll('#loberdata .data-input').forEach(input => {
        if (profileData[input.id]) {
            input.value = profileData[input.id];
        } else {
            input.value = ''; // Ryd feltet, hvis data ikke findes
        }
    });

    // Udfyld zone-data fra arrays
    const zoneTypes = { hr: 'hr_zones', power: 'power_zones', pace: 'pace_zones' };
    for (const prefix in zoneTypes) {
        const arrayKey = zoneTypes[prefix];
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`${prefix}Zone${i}`);
            if (input) {
                const value = (profileData[arrayKey] && profileData[arrayKey][i - 1]) ? profileData[arrayKey][i - 1] : '';
                input.value = value;
            }
        }
    }
    
    personalizeDashboard(profileData.runnerName);
    initializeProfilePageCalculations();
}

// --- ANDRE FUNKTIONER ---
async function loadProfileData() {
    try {
        const response = await fetch('/api/get-profile');
        if (!response.ok) {
            if (response.status === 404 || response.status === 204) {
                 console.log("Ingen profil fundet i databasen. Det er ok.");
                 return;
            }
            throw new Error('Serverfejl ved hentning af profil');
        }
        
        const profileData = await response.json();
        populateFormWithProfileData(profileData);
    } catch (error) {
        console.error("Fejl ved indlæsning af profil:", error);
    }
}

function initializeProfilePageCalculations() {
    const runnerDobInput = document.getElementById('runnerDob');
    const calculatedAgeEl = document.getElementById('calculatedAge');
    
    const calculateAge = (dobString) => {
        if (!dobString) return '-';
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };
    
    runnerDobInput?.addEventListener('input', () => {
        if(calculatedAgeEl) calculatedAgeEl.textContent = calculateAge(runnerDobInput.value);
    });

    if (runnerDobInput && runnerDobInput.value) {
         if(calculatedAgeEl) calculatedAgeEl.textContent = calculateAge(runnerDobInput.value);
    }
}

function personalizeDashboard(name) {
    const nameEl = document.getElementById('dashboard-runner-name');
    if (nameEl && name) {
        nameEl.textContent = `Velkommen, ${name}`;
    } else if (nameEl) {
        nameEl.textContent = `Min Løberprofil`;
    }
}

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

// --- APPENS "MOTOR" ---
document.addEventListener('DOMContentLoaded', function() {
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.page).classList.add('active');
        });
    });

    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
        const saveButton = document.getElementById('saveProfileBtn');
        saveButton.textContent = "Gemmer...";
        saveButton.disabled = true;

        const profileData = collectProfileDataFromForm();

        try {
            const response = await fetch('/api/save-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            if (!response.ok) throw new Error("Serveren kunne ikke gemme profilen.");
            saveButton.textContent = "Profil Gemt!";
            personalizeDashboard(profileData.runnerName);
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

    document.getElementById('exportProfileBtn')?.addEventListener('click', () => {
        const profileData = collectProfileDataFromForm();
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

    const loadProfileBtn = document.getElementById('loadProfileBtn');
    const profileFileInput = document.getElementById('profileFileInput');
    loadProfileBtn?.addEventListener('click', () => profileFileInput.click());

    profileFileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                populateFormWithProfileData(importedData);
                alert('Profilen er indlæst. Tryk på "Gem Profil i Database" for at gemme ændringerne permanent.');
            } catch (error) {
                console.error("Fejl ved indlæsning af profilfil:", error);
                alert("Ugyldig profilfil.");
            }
        };
        reader.readAsText(file);
    });

    initializeCalendar();
    loadProfileData();
    updateHomePageDashboard();
    initializePlanPage();
    initializeProfilePageCalculations();
    updateHomepageStatus();
    initializeAnalysePage();
    initializeStravaConnection();
});