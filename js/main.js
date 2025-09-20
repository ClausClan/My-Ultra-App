// Fil: js/main.js - ENDELIG, KORREKT OG RENSET VERSION

import { supabaseClient } from './supabaseClient.js';
import { initializeCalendar, getDailyLogs } from './modules/calendarManager.js';
import { initializePlanPage, loadActivePlan, getActivePlan, activePlanName } from './modules/planManager.js';
import { updateHomePageDashboard } from './modules/chartManager.js';
import { initializeAnalysePage } from './modules/analyseManager.js';
import { formatDateKey } from './modules/utils.js';
import { initializeStravaConnection } from './modules/stravaManager.js';
import { loadProfile, initializeAutosave } from './modules/profileManager.js';

// --- DEFINER ELEMENTER ---
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loadingOverlay = document.getElementById('loading-overlay');
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('main > section.page');
const logoutButton = document.getElementById('logout-button');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');

// --- APPENS HOVEDFUNKTIONER ---
async function main() {
    console.log("main() starter: Henter brugerdata...");
    if(loadingOverlay) loadingOverlay.classList.remove('hidden');
    try {
        const profile = await loadProfile();
        await loadActivePlan();
        initializePlanPage();
        await initializeCalendar();
        const allLogs = getDailyLogs();
        updateHomePageDashboard(allLogs);
        initializeAnalysePage();
        initializeStravaConnection();
        initializeAutosave();
        updateDashboardHeader(profile);
        updateDashboardStatus();
        console.log("main() færdig: Alle moduler er initialiseret.");
        const hjemButton = document.querySelector('.nav-btn[data-page="hjem"]');
        if(hjemButton) hjemButton.click();
    } catch (error) {
        console.error("Fejl under initialisering af appen:", error);
        alert("Der skete en fejl under indlæsning af dine data.");
    } finally {
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

function updateDashboardHeader(profile) {
    const runnerNameDisplay = document.getElementById('dashboard-runner-name');
    const thumbnailDisplay = document.getElementById('dashboard-thumbnail');
    if (runnerNameDisplay && profile && profile.runner_name) {
        runnerNameDisplay.textContent = profile.runner_name;
    } else if (runnerNameDisplay) {
        runnerNameDisplay.textContent = 'Min Løberprofil';
    }
    if (thumbnailDisplay && profile && profile.profile_picture_url) {
        thumbnailDisplay.src = profile.profile_picture_url;
    } else if (thumbnailDisplay) {
        thumbnailDisplay.src = 'images/logo3.png';
    }
}

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

// --- HOVED-LOGIK: DEN ENESTE INDGANG TIL APPEN ---
async function initializeApp() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') && params.has('scope')) {
        document.body.innerHTML = '<h1>Forbinder til Strava... Vent venligst.</h1>';
        try {
            const response = await fetch('/api/strava', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: params.get('code'), redirect_uri: window.location.origin })
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Kunne ikke udveksle Strava-kode.');
            const data = await response.json();
            localStorage.setItem('strava_access_token', data.access_token);
            localStorage.setItem('strava_refresh_token', data.refresh_token);
            localStorage.setItem('strava_token_expires_at', data.expires_at);
            localStorage.setItem('strava_athlete_info', JSON.stringify(data.athlete));
            window.location.replace(window.location.pathname);
        } catch (error) {
            document.body.innerHTML = `<h1>Fejl under Strava-login: ${error.message}</h1>`;
        }
        return;
    }

const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        if(appSection) appSection.style.display = 'block';
        if(loginSection) loginSection.style.display = 'none';
        if(logoutButton) logoutButton.style.display = 'block';
        await main();
    } else {
        // Bruger er ikke logget ind
        if(appSection) appSection.style.display = 'none';
        if(loginSection) loginSection.style.display = 'block';
        if(logoutButton) logoutButton.style.display = 'none';
        
        // RETTET: Sørg for at spinneren ALTID er skjult, når vi viser login-siden
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.reload();
        }
    });
}

// --- KØRSEL OG EVENT LISTENERS ---
initializeApp();

navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-page');
        sections.forEach(section => section.classList.toggle('active', section.id === targetId));
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

loginButton?.addEventListener('click', async () => {
    loginButton.disabled = true;
    loginButton.textContent = 'Logger ind...';

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value,
        });
        if (error) {
            // Vis fejlen både som en alert og i konsollen
            alert(error.message);
            console.error('Login fejl:', error);
        }
    } catch (e) {
        alert('En uventet fejl opstod.');
        console.error('Uventet login fejl:', e);
    } finally {
        // Nulstil knappen, uanset om det lykkedes eller ej
        loginButton.disabled = false;
        loginButton.textContent = 'Log Ind';
    }
});

signupButton?.addEventListener('click', async () => {
    signupButton.disabled = true;
    signupButton.textContent = 'Opretter...';
    try {
        const { error } = await supabaseClient.auth.signUp({
            email: emailInput.value,
            password: passwordInput.value,
        });
        if (error) {
            alert(error.message);
            console.error('Signup fejl:', error);
        } else {
            alert('Bruger oprettet! Tjek din email for at bekræfte din konto.');
        }
    } catch (e) {
        alert('En uventet fejl opstod.');
        console.error('Uventet signup fejl:', e);
    } finally {
        signupButton.disabled = false;
        signupButton.textContent = 'Opret Bruger';
    }
});

logoutButton?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});