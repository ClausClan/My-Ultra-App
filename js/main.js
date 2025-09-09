// js/main.js

// ## Trin X: Importer alle nødvendige moduler og klienter ##
// -----------------------------------------------------------------

import { supabaseClient } from './supabaseClient.js';
import { initializeCalendar, getDailyLogs } from './modules/calendarManager.js';
import { initializePlanPage, loadActivePlan, getActivePlan, activePlanName } from './modules/planManager.js';
import { updateHomePageDashboard } from './modules/chartManager.js'; 
import { initializeAnalysePage } from './modules/analyseManager.js'; 
import { formatDateKey } from './modules/utils.js';
import { initializeStravaConnection } from './modules/stravaManager.js'; 
import { loadProfile, initializeAutosave } from './modules/profileManager.js';

// --- TRIN 1: DØRMANDEN / GATEKEEPER ---
// Denne funktion kører FØR alt andet. Den tjekker, om vi er midt i en omdirigering.
async function handleRedirects() {
    const params = new URLSearchParams(window.location.search);
    
    // Håndter Strava-login
    if (params.has('code') && params.has('scope')) {
        const code = params.get('code');
        
        // Vis en simpel loading-besked, der ikke ødelægger noget
        document.body.innerHTML = '<h1>Forbinder til Strava... Vent venligst.</h1>';

        try {
            const response = await fetch('/api/strava-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            });
            if (!response.ok) throw new Error('Kunne ikke udveksle Strava-kode.');
            
            const data = await response.json();
            localStorage.setItem('strava_access_token', data.access_token);
            localStorage.setItem('strava_refresh_token', data.refresh_token);
            localStorage.setItem('strava_token_expires_at', data.expires_at);
            localStorage.setItem('strava_athlete_info', JSON.stringify(data.athlete));
            
            // Genindlæs siden rent uden URL-parametre
            window.location.replace(window.location.pathname);

        } catch (error) {
            document.body.innerHTML = `<h1>Fejl under Strava-login: ${error.message}</h1>`;
        }
        
        return true; // Vigtigt: Fortæl resten af scriptet, at det skal stoppe
    }
    
    return false; // Fortæl resten af scriptet, at det kan fortsætte normalt
}

// --- TRIN X: HOVED-APP LOGIK ---
// Denne del af koden kører kun, hvis "dørmanden" siger, det er ok.
async function startApp() {

// ## Trin 2: Definer de vigtigste HTML-elementer ##
// -----------------------------------------------------------------

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loadingOverlay = document.getElementById('loading-overlay'); // RETTET: Bruger den nye overlay
const navButtons = document.querySelectorAll('.nav-btn'); // RETTET: Matcher HTML's class
const sections = document.querySelectorAll('main > section.page');
const logoutButton = document.getElementById('logout-button');

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
        updateDashboardStatus();
        
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

// ## Trin X: Håndtering af Bruger-Session ##
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



// ## Trin X: Opsæt Event Listeners (Navigation, Profil, Auth) ##
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

// Hjælpefunktioner til dashboard
function updateDashboardHeader(profile) {
    const runnerNameDisplay = document.getElementById('dashboard-runner-name');
    const thumbnailDisplay = document.getElementById('dashboard-thumbnail');

    if (runnerNameDisplay && profile && profile.runner_name) {
        runnerNameDisplay.textContent = profile.runner_name;
    } else if (runnerNameDisplay) {
        runnerNameDisplay.textContent = 'Min Løberprofil';
    }

    if (thumbnailDisplay && profile && profile.profilePicture) {
        thumbnailDisplay.src = profile.profilePicture;
    } else if (thumbnailDisplay) {
        thumbnailDisplay.src = 'images/logo3.png';
    }
}

// Hjælpefunktion til at opdatere header
function updateDashboardStatus() {
    const planStatusContent = document.getElementById('plan-status-content');
    const todayTrainingText = document.getElementById('todayTrainingText');
    const activePlan = getActivePlan();

    if (!planStatusContent || !todayTrainingText) return;

    if (activePlan && activePlan.length > 0) {
        const planName = activePlanName || 'Aktiv Træningsplan';
        const startDate = new Date(activePlan[0].date).toLocaleDateString('da-DK');
        const endDate = new Date(activePlan[activePlan.length - 1].date).toLocaleDateString('da-DK');
        planStatusContent.innerHTML = `<p><strong>Plan:</strong> ${planName}</p><p><strong>Periode:</strong> ${startDate} - ${endDate}</p>`;
    } else {
        planStatusContent.innerHTML = '<p>Ingen aktiv plan.</p>';
    }

    const todayKey = formatDateKey(new Date());
    const todayPlan = activePlan.find(day => day.date === todayKey);

    if (todayPlan && todayPlan.plan) {
        todayTrainingText.textContent = todayPlan.plan;
    } else {
        todayTrainingText.textContent = 'Ingen træning planlagt i dag.';
    }
}
}
// --- TRIN 3: KØRSEL ---
// Start "dørmanden". Hvis den returnerer false, startes den normale app.
handleRedirects().then(isRedirecting => {
    if (!isRedirecting) {
        startApp();
    }
});