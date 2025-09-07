// js/main.js

// ## Trin 1: Importer alle nødvendige moduler og klienter ##
// -----------------------------------------------------------------

import { supabaseClient } from './supabaseClient.js';
import { initializeCalendar, getDailyLogs } from './modules/calendarManager.js'; // RETTET: Importer også getDailyLogs
import { initializePlanPage } from './modules/planManager.js'; // RETTET: Korrekt funktionsnavn
import { updateHomePageDashboard } from './modules/chartManager.js'; // RETTET: Importer den korrekte funktion
import { initializeAnalysePage } from './modules/analyseManager.js'; // RETTET: Korrekt funktionsnavn
import { initializeStravaConnection } from './modules/stravaManager.js'; // RETTET: Korrekt funktionsnavn
import { authenticatedFetch } from './modules/utils.js';

// ## Trin 2: Definer de vigtigste HTML-elementer ##
// -----------------------------------------------------------------

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loadingOverlay = document.getElementById('loading-overlay'); // RETTET: Bruger den nye overlay
const navButtons = document.querySelectorAll('.nav-btn'); // RETTET: Matcher HTML's class
const sections = document.querySelectorAll('main > section.page');
const logoutButton = document.getElementById('logout-button');
const runnerNameInput = document.getElementById('runnerName'); // Tilføjet for profilhåndtering

// ## Trin 3: Applikationens "Hovedmotor" ##
// -----------------------------------------------------------------

async function main() {
    console.log("main() starter: Henter brugerdata...");
    loadingOverlay.classList.remove('hidden');

    try {
        // RETTET RÆKKEFØLGE
        // 1. Hent profildata først, da det er nødvendigt for andre moduler
        const profile = await loadProfile();

        // 2. Initialiser planen, da kalenderen har brug for den
        await initializePlanPage();

        // 3. Initialiser kalenderen, som henter alle logs
        await initializeCalendar();
        
        // 4. Hent de logs, som kalenderen lige har indlæst
        const allLogs = getDailyLogs();
        
        // 5. Opdater nu dashboard-graferne med de hentede logs
        updateHomePageDashboard(allLogs);
        
        // 6. Kør de resterende initialiseringer, der kan køre uafhængigt
        initializeAnalysePage();
        initializeStravaConnection();

        // Opdater UI elementer, der afhænger af data
        updateDashboardHeader(profile);
        
        console.log("main() færdig: Alle moduler er initialiseret.");
        
        // Sæt startsiden til 'Hjem' efter alt er hentet.
        document.querySelector('.nav-btn[data-page="hjem"]').click();

    } catch (error) {
        console.error("Fejl under initialisering af appen:", error);
        alert("Der skete en fejl under indlæsning af dine data. Prøv venligst at genindlæse siden.");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}


// ## Trin 4: Håndtering af Bruger-Session ##
// -----------------------------------------------------------------

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('onAuthStateChange event:', event, session);

    if (session) {
        console.log("Bruger er logget ind. Viser app og skjuler login.");
        appSection.style.display = 'block';
        loginSection.style.display = 'none';
        logoutButton.style.display = 'block';
        
        await main();
    } else {
        console.log("Bruger er ikke logget ind. Viser login-skærm.");
        appSection.style.display = 'none';
        loginSection.style.display = 'block';
        logoutButton.style.display = 'none';
        loadingOverlay.classList.add('hidden');
    }
});


// ## Trin 5: Opsæt Event Listeners (Navigation, Profil, Auth) ##
// -----------------------------------------------------------------

// Navigation
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-page');
        
        sections.forEach(section => {
            section.classList.toggle('active', section.id === targetId);
        });

        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

// Profilhåndtering
async function loadProfile() {
    try {
        const response = await authenticatedFetch('/api/get-profile');
        if (response.status === 204) {
            console.log('Ingen profil fundet for brugeren.');
            return null;
        }
        if (!response.ok) throw new Error('Failed to fetch profile');
        
        const profile = await response.json();
        
        // Find formularen på 'løberdata'-siden
        const profileForm = document.getElementById('loberdata');
        if (!profileForm) return profile; // Gå ud hvis formen ikke findes

        // Gå igennem alle felter fra databasen
        for (const key in profile) {
            
            // NY LOGIK: Definer de felter, der er arrays
            const zoneMapping = {
                hrZone: 'hr_zones',      // Databasenavn -> HTML ID prefix
                powerZone: 'power_zones',
                paceZone: 'pace_zones'
            };

            // TJEK: Er dette felt et af vores zone-arrays?
            if (zoneMapping[key] && Array.isArray(profile[key])) {
                const prefix = zoneMapping[key];
                
                // Kør en løkke igennem array'et fra databasen
                profile[key].forEach((value, index) => {
                    const elementId = `${prefix}${index + 1}`; // Byg ID'et, f.eks. "hrZone1"
                    const inputElement = profileForm.querySelector(`[id="${elementId}"]`);
                    if (inputElement) {
                        inputElement.value = value || ''; // Sæt værdien i den korrekte input-boks
                    }
                });
            } else {
                // GAMMEL LOGIK: Håndter alle andre normale felter
                const inputElement = profileForm.querySelector(`[id="${key}"]`);
                if (inputElement) {
                    inputElement.value = profile[key] || '';
                }
            }
        }
        
        return profile;
        
    } catch (error) {
        console.error('Kunne ikke hente profil:', error);
        return null;
    }
}

function updateDashboardHeader(profile) {
    const runnerNameDisplay = document.getElementById('dashboard-runner-name');
    if (runnerNameDisplay && profile && profile.runnerName) {
        runnerNameDisplay.textContent = profile.runnerName;
    } else if (runnerNameDisplay) {
        runnerNameDisplay.textContent = 'Min Løberprofil';
    }
}


// Auth knapper (Login, Signup, Logout)
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');

loginButton.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });
    if (error) alert(error.message);
});

signupButton.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value,
    });
    if (error) {
        alert(error.message);
    } else {
        alert('Bruger oprettet! Tjek din email for at bekræfte din konto.');
    }
});

logoutButton.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error('Fejl ved log ud:', error);
    // onAuthStateChange vil automatisk håndtere UI-skiftet
});