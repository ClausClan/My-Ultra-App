// js/modules/utils.js

import { supabase } from '../supabaseClient.js';

export function estimateTssFromPlan(planText) {
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

export function formatDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    // getMonth() er 0-baseret, så vi lægger 1 til
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * En "wrapper" omkring den normale fetch-funktion, som automatisk tilføjer
 * brugerens authentication token.
 * @param {string} url - Den API-URL, der skal kaldes.
 * @param {object} options - Et standard options-objekt til fetch (f.eks. method, body).
 * @returns {Promise<Response>} - Et promise, der resolver til fetch-responset.
 */
export async function authenticatedFetch(url, options = {}) {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession(); // <-- CORRECTION 2

    if (sessionError) {
        console.error('Error fetching session:', sessionError);
        window.location.href = '/'; 
        return;
    }

    if (!session) {
        console.warn('Attempted to make an authenticated call without being logged in.');
        window.location.href = '/';
        return;
    }

    const headers = {
        ...options.headers,
        'Content-Type': 'application/json'
    };
    
    headers['Authorization'] = `Bearer ${session.accessToken}`;

    const newOptions = {
        ...options,
        headers
    };

    return fetch(url, newOptions);
}