import { initializeCalendar } from './modules/calendarManager.js';
import { updateHomePageDashboard } from './modules/chartManager.js';
import { initializePlanPage, getActivePlan } from './modules/planManager.js';
import { initializeAnalysePage } from './modules/analyseManager.js';
import { initializeStravaConnection } from './modules/stravaManager.js';

// Funktion til at hente profildata fra databasen og udfylde formularen
async function loadProfileData() {
    try {
        const response = await fetch('/api/get-profile');
        if (!response.ok) {
            // Hvis der ikke er en profil endnu, sker der ikke noget.
            if (response.status === 404) return;
            throw new Error('Kunne ikke hente profil');
        }
        const profileData = await response.json();
        
        if (profileData) {
            // Find alle input-felter på Løberdata-siden
            const allDataInputs = document.querySelectorAll('#loberdata .data-input');
            allDataInputs.forEach(input => {
                // Udfyld feltets værdi, hvis der findes en matchende nøgle i dataene
                if (profileData[input.id]) {
                    input.value = profileData[input.id];
                }
            });

            // Særlige tilfælde som alder og profilbillede kan håndteres her
            // (Denne del kan udbygges senere)
        }
    } catch (error) {
        console.error("Fejl ved indlæsning af profil:", error);
    }
}




// --- FUNKTION: Opdaterer dashboard med navn og billede ---
function personalizeDashboard() {
    const name = localStorage.getItem('runnerName');
    const pictureSrc = localStorage.getItem('profilePicture');

    const nameEl = document.getElementById('dashboard-runner-name');
    const thumbEl = document.getElementById('dashboard-thumbnail');

    if (nameEl && name) {
        nameEl.textContent = `Velkommen, ${name}`;
    } else if (nameEl) {
        nameEl.textContent = `Min Løberprofil`;
    }

    if (thumbEl && pictureSrc) {
        thumbEl.src = pictureSrc;
        thumbEl.style.display = 'block';
    } else if (thumbEl) {
        thumbEl.style.display = 'none';
    }
}

// --- FUNKTION: Håndterer logik på Løberdata-siden ---
function initializeProfilePage() {
    const runnerDobInput = document.getElementById('runnerDob');
    const calculatedAgeEl = document.getElementById('calculatedAge');
    const profilePicInput = document.getElementById('profilePictureInput');
    const profilePicPreview = document.getElementById('profilePicturePreview');

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
    
    profilePicInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            localStorage.setItem('profilePicture', dataUrl);
            profilePicPreview.src = dataUrl;
            profilePicPreview.style.display = 'block';
            personalizeDashboard();
        };
        reader.readAsDataURL(file);
    });
    
    runnerDobInput?.addEventListener('input', () => {
        calculatedAgeEl.textContent = calculateAge(runnerDobInput.value);
    });
    
    const savedDob = localStorage.getItem('runnerDob');
    if (savedDob) {
        runnerDobInput.value = savedDob;
        calculatedAgeEl.textContent = calculateAge(savedDob);
    }

    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) {
        profilePicPreview.src = savedPic;
        profilePicPreview.style.display = 'block';
    } else {
        profilePicPreview.style.display = 'none';
    }
}

// --- NY FUNKTION: Opdaterer Plan Status og Dagens Træning på forsiden ---
function updateHomepageStatus() {
    const planStatusText = document.getElementById('planStatusText');
    const todayTrainingText = document.getElementById('todayTrainingText');
    const activePlan = getActivePlan(); // Henter planen via planManager

    if (activePlan && activePlan.length > 0) {
        planStatusText.textContent = `Aktiv plan er indlæst. God træning!`;
        
        const today = new Date().toISOString().split('T')[0];
        const todaysTraining = activePlan.find(day => day.date === today);

        if (todaysTraining) {
            todayTrainingText.textContent = todaysTraining.plan;
        } else {
            todayTrainingText.textContent = 'Ingen træning planlagt i dag.';
        }
    } else {
        planStatusText.textContent = 'Ingen aktiv plan. Importer en plan for at komme i gang.';
        todayTrainingText.textContent = 'Ingen træning planlagt i dag.';
    }
}



document.addEventListener('DOMContentLoaded', function() {
    // --- NAVIGATION ---
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
                personalizeDashboard();
                updateHomepageStatus(); // Kald den her også
            }
        });
    });

    // --- LØBERDATA (RUNNER DATA) SAVING ---

    // Ny event listener for "Gem Profil"-knappen
document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    const saveButton = document.getElementById('saveProfileBtn');
    saveButton.textContent = "Gemmer...";
    saveButton.disabled = true;

    const profileData = {};
    const allDataInputs = document.querySelectorAll('#loberdata .data-input');
    allDataInputs.forEach(input => {
        profileData[input.id] = input.value;
    });

    try {
        const response = await fetch('/api/save-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) throw new Error("Serveren kunne ikke gemme profilen.");

        saveButton.textContent = "Profil Gemt!";
        setTimeout(() => {
            saveButton.textContent = "Gem Profil";
            saveButton.disabled = false;
        }, 2000);

    } catch (error) {
        console.error("Fejl ved at gemme profil:", error);
        saveButton.textContent = "Fejl - Prøv Igen";
        saveButton.disabled = false;
    }
});

    // --- INITIALIZE MODULES & PAGES ---
    initializeCalendar();
    loadProfileData(); 
    updateHomePageDashboard();
    initializePlanPage();
    initializeProfilePage();
    personalizeDashboard();
    updateHomepageStatus(); // Kald funktionen ved start
    initializeAnalysePage();
    initializeStravaConnection();
});