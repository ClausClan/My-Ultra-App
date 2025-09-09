// js/main.js

// ## Trin 1: Importer alle nødvendige moduler og klienter ##
// -----------------------------------------------------------------

import { supabaseClient } from './supabaseClient.js';
import { initializeCalendar, getDailyLogs } from './modules/calendarManager.js'; // RETTET: Importer også getDailyLogs
import { initializePlanPage, loadActivePlan } from './modules/planManager.js'; // RETTET: Korrekt funktionsnavn
import { updateHomePageDashboard } from './modules/chartManager.js'; // RETTET: Importer den korrekte funktion
import { initializeAnalysePage } from './modules/analyseManager.js'; // RETTET: Korrekt funktionsnavn
import { initializeStravaConnection } from './modules/stravaManager.js'; // RETTET: Korrekt funktionsnavn
//import { authenticatedFetch } from './modules/utils.js';
import { loadProfile, initializeAutosave } from './modules/profileManager.js';

// ## Trin 2: Definer de vigtigste HTML-elementer ##
// -----------------------------------------------------------------

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loadingOverlay = document.getElementById('loading-overlay'); // RETTET: Bruger den nye overlay
const navButtons = document.querySelectorAll('.nav-btn'); // RETTET: Matcher HTML's class
const sections = document.querySelectorAll('main > section.page');
const logoutButton = document.getElementById('logout-button');
//const runnerNameInput = document.getElementById('runnerName'); // Tilføjet for profilhåndtering

// ## Trin 3: Applikationens "Hovedmotor" ##
// -----------------------------------------------------------------

async function main() {
    console.log("main() starter: Henter brugerdata...");
    loadingOverlay.classList.remove('hidden');

    try {
        // RETTET RÆKKEFØLGE
        // 1. Hent profildata først, da det er nødvendigt for andre moduler
        const profile = await loadProfile();
        await loadActivePlan();

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
        initializeAutosave();

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

// Hjælpefunktion til at opdatere header
function updateDashboardHeader(profile) {
    const runnerNameDisplay = document.getElementById('dashboard-runner-name');
    const thumbnailDisplay = document.getElementById('dashboard-thumbnail'); // Finder forside-billedet

    // Opdater navnet på forsiden
    if (runnerNameDisplay && profile && profile.runner_name) {
        runnerNameDisplay.textContent = profile.runner_name;
    } else if (runnerNameDisplay) {
        runnerNameDisplay.textContent = 'Min Løberprofil';
    }

    //Opdater billedet på forsiden
    if (thumbnailDisplay && profile && profile.profilePicture) {
        thumbnailDisplay.src = profile.profilePicture;
    } else if (thumbnailDisplay) {
        // Sæt et standardbillede, hvis der ikke er noget i databasen
        thumbnailDisplay.src = 'images/logo3.png'; // Eller en anden placeholder
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