// js/modules/utils.js

// ## Trin 1: Korrekt import af Supabase-klienten ##
// Stien starter med '/', hvilket er den mest robuste måde at løse import-fejl på.
import { supabaseClient } from '/js/supabaseClient.js';


// ## Trin 2: Funktion til sikre API-kald ##
// Opdateret til at bruge den importerede supabaseClient til at hente brugerens session.
async function authenticatedFetch(url, options = {}) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        throw new Error('Bruger er ikke logget ind. Kan ikke lave et autentificeret API-kald.');
    }
    const headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
    };
    return fetch(url, { ...options, headers });
}


// ## Trin 3: Din unikke TSS-beregningslogik ##
// Dette er din præcise kode, bevaret 1:1.
function estimateTssFromPlan(planText) {
    if (!planText) return 0;
    const text = planText.toLowerCase();

    // Tjek for løb (A, B, C-mål) først
    if (text.startsWith('a-mål')) return 150;
    if (text.startsWith('b-mål')) return 120;
    if (text.startsWith('c-mål')) return 90;
    if (text.includes('hvile') || text.includes('restitution')) return 15;

    let durationInMinutes = 0;
    const hourMatch = text.match(/(\d+(\.\d+)?)\s*t/);
    if (hourMatch) {
        durationInMinutes = parseFloat(hourMatch[1]) * 60;
    } else {
        const minMatch = text.match(/(\d+)\s*min/);
        if (minMatch) {
            durationInMinutes = parseInt(minMatch[1], 10);
        }
    }

    let baseTssPerHour = 60; // Default
    if (text.includes('recovery')) baseTssPerHour = 35;
    if (text.includes('aktiv restitution')) baseTssPerHour = 35;
    if (text.includes('endurance')) baseTssPerHour = 65;
    if (text.includes('steady-state')) baseTssPerHour = 80;
    if (text.includes('fartleg')) baseTssPerHour = 85;
    if (text.includes('tempo')) baseTssPerHour = 90;
    if (text.includes('interval') || text.includes('vo2max')) baseTssPerHour = 105;
    if (text.includes('Strength')) baseTssPerHour = 35;

    if (durationInMinutes > 0) {
        return Math.round((baseTssPerHour / 60) * durationInMinutes);
    }
    
    return baseTssPerHour;
}


// ## Trin 4: Korrekt eksport af begge funktioner ##
export { authenticatedFetch, estimateTssFromPlan };