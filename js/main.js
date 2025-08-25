// js/main.js

// ## Trin 1: Importer alle nødvendige moduler og klienter ##
// -----------------------------------------------------------------

// Importer den delte Supabase-klient. Dette er den vigtigste nye linje.
import { supabaseClient } from './supabaseClient.js'; 

// Importer appens øvrige moduler som før.
import { initializeCalendar } from './modules/calendarManager.js';
import { initializePlan } from './modules/planManager.js';
import { initializeDashboardCharts } from './modules/chartManager.js';
import { initializeAnalysePage as initializeAnalysis } from './modules/analyseManager.js';
import { initializeStrava } from './modules/stravaManager.js';
import { authenticatedFetch } from './modules/utils.js';

// ## Trin 2: Definer de vigtigste HTML-elementer ##
// -----------------------------------------------------------------

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loadingIndicator = document.getElementById('loading-indicator');

const navLinks = document.querySelectorAll('nav a');
const sections = document.querySelectorAll('main > section');

const profileForm = document.getElementById('profile-form');
const logoutButton = document.getElementById('logout-button');

// ## Trin 3: Applikationens "Hovedmotor" ##
// -----------------------------------------------------------------

// Denne funktion henter al data, når en bruger er logget ind.
async function main() {
    console.log("main() starter: Henter brugerdata...");
    loadingIndicator.style.display = 'block'; // Vis loader

    try {
        // Initialiser alle appens moduler parallelt for hurtigere indlæsning.
        await Promise.all([
            initializeDashboardCharts(),
            initializeCalendar(),
            initializePlan(),
            initializeAnalysis(),
            initializeStrava(),
            loadProfile() // Hent og vis løberens profil.
        ]);
        
        console.log("main() færdig: Alle moduler er initialiseret.");
        
        // Sæt startsiden til 'Hjem' efter alt er hentet.
        document.querySelector('nav a[data-target="home"]').click();

    } catch (error) {
        console.error("Fejl under initialisering af appen:", error);
        alert("Der skete en fejl under indlæsning af dine data. Prøv venligst at genindlæse siden.");
    } finally {
        loadingIndicator.style.display = 'none'; // Skjul loader
    }
}


// ## Trin 4: Håndtering af Bruger-Session (Det nye omdrejningspunkt) ##
// -----------------------------------------------------------------

// Denne listener reagerer, når en bruger logger ind, logger ud, eller når siden indlæses.
// Dette er nu det ENESTE startpunkt for hele applikationen.
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('onAuthStateChange event:', event);

    if (session) {
        // **SCENARIE: Brugeren er logget ind.**
        console.log("Bruger er logget ind. Viser app og skjuler login.");
        appSection.style.display = 'block';
        loginSection.style.display = 'none';
        
        // Kald hovedfunktionen for at hente og vise brugerens data.
        await main();

    } else {
        // **SCENARIE: Brugeren er IKKE logget ind.**
        console.log("Bruger er ikke logget ind. Viser login-skærm.");
        appSection.style.display = 'none';
        loginSection.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }
});


// ## Trin 5: Opsæt Event Listeners (Navigation, Profil, Logout) ##
// -----------------------------------------------------------------
// Denne kode er identisk med din oprindelige, den er blot flyttet udenfor
// den gamle DOMContentLoaded-listener.

// Navigation i appen (skift mellem sektioner).
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        
        sections.forEach(section => {
            section.style.display = section.id === targetId ? 'block' : 'none';
        });

        navLinks.forEach(navLink => {
            navLink.classList.remove('active');
        });
        link.classList.add('active');
    });
});

// Gem løberprofil.
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(profileForm);
    const profileData = Object.fromEntries(formData.entries());
    
    try {
        const response = await authenticatedFetch('/api/save-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData),
        });
        if (!response.ok) throw new Error('Failed to save profile');
        alert('Profil gemt!');
    } catch (error) {
        console.error('Fejl ved gemning af profil:', error);
        alert('Der skete en fejl. Kunne ikke gemme profilen.');
    }
});

// Hent og vis eksisterende profil.
async function loadProfile() {
    try {
        const response = await authenticatedFetch('/api/get-profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const profile = await response.json();
        
        // Udfyld formularen med de hentede data.
        for (const key in profile) {
            if (profileForm.elements[key]) {
                profileForm.elements[key].value = profile[key];
            }
        }
    } catch (error) {
        console.error('Kunne ikke hente profil:', error);
    }
}

// Log ud.
logoutButton.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Fejl ved log ud:', error);
    } else {
        // onAuthStateChange vil automatisk fange dette og vise login-skærmen.
        // Du kan eventuelt tvinge en genindlæsning for at rydde al state helt.
        window.location.reload(); 
    }
});