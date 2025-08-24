// planManager.js - FULD VERSION MED DATABASE OG KORREKT VISNING (14. AUGUST 2025)
import { estimateTssFromPlan } from './utils.js';

let activePlan = [];
let activePlanName = '';
let planTimelineChart = null;
let currentWeekIndex = 0;
let weeks = [];

// --- HJÆLPEFUNKTIONER ---

function getWorkoutDetails(planText) {
    const text = planText.toLowerCase();
    const details = {
        color: '#6b7280', // Grå (default/Andet)
        type: 'Andet',
        rpe: ''
    };

    // NYT: Tjek for mål som det ALLERFØRSTE
    if (text.startsWith('a-mål:') || text.startsWith('b-mål:') || text.startsWith('c-mål:')) {
        details.color = '#f97316'; // Orange for Race
        details.type = 'Race';
    } 
    // Hvis det ikke er et mål, så tjek for de andre typer
    else if (text.includes('recovery')) { details.color = '#16a34a'; details.type = 'Recovery'; }
    else if (text.includes('aktiv restitution')) { details.color = '#16a34a'; details.type = 'Recovery'; }
    else if (text.includes('endurance')) { details.color = '#0ea5e9'; details.type = 'Endurance'; }
    else if (text.includes('steady-state')) { details.color = '#0891b2'; details.type = 'Steady'; }
    else if (text.includes('tempo')) { details.color = '#f97316'; details.type = 'Tempo'; }
    else if (text.includes('fartleg')) { details.color = '#f59e0b'; details.type = 'Fartleg'; }
    else if (text.includes('interval') || text.includes('vo2max')) { details.color = '#ef4444'; details.type = 'Interval'; }
    else if (text.includes('strength')) { details.color = '#8b5cf6'; details.type = 'Strength'; }
    else if (text.includes('hvile')) { details.type = 'Hvile'; }
    
    const rpeMatch = text.match(/rpe\s*\d(-\d)?/);
    if (rpeMatch) {
        details.rpe = rpeMatch[0].toUpperCase();
    }
    return details;
}


function getStartOfWeekKey(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
}
function getWeekNumberForDisplay(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

// --- DATAHÅNDTERING ---
async function saveActivePlan(planName, planData) {
    try {
        const response = await fetch('/api/save-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planName, planData })
        });
        if (!response.ok) throw new Error('Kunne ikke gemme planen');
        activePlan = planData;
        activePlanName = planName;
    } catch (error) {
        console.error("Fejl ved at gemme plan:", error);
        alert("Der opstod en fejl.");
    }
}
export async function loadActivePlan() {
    try {
        const response = await fetch('/api/get-plan');
        if (response.status === 204 || response.status === 404) {
            activePlan = []; activePlanName = ''; return;
        }
        if (!response.ok) throw new Error('Kunne ikke hente plan');
        const planObject = await response.json();
        if (planObject && planObject.plan_data) {
            activePlan = planObject.plan_data;
            activePlanName = planObject.plan_name;
        }
    } catch (error) { console.error("Fejl ved hentning af plan:", error); }
}

// --- VISNING AF PLAN-SIDEN ---
function renderPlanTimelineChart() {
    const ctx = document.getElementById('planTimelineChart')?.getContext('2d');
    if (!ctx) return;
    if (planTimelineChart) planTimelineChart.destroy();
    if (!activePlan || activePlan.length === 0) return;

    const CTL_CONST = 42, ATL_CONST = 7;
    let ctl = 0, atl = 0;
    const ctlData = [], atlData = [], tsbData = [];
    const raceAnnotations = {};
    const today = new Date().toISOString().split('T')[0];

    activePlan.forEach(day => {
        const tss = estimateTssFromPlan(day.plan);
        ctl += (tss - ctl) / CTL_CONST;
        atl += (tss - atl) / ATL_CONST;
        ctlData.push({ x: day.date, y: ctl });
        atlData.push({ x: day.date, y: atl });
        tsbData.push({ x: day.date, y: ctl - atl });

const planText = day.plan.toLowerCase();

// Betingelsen for at tegne en streg er korrekt
if (planText.startsWith('a-mål') || planText.startsWith('b-mål') || planText.startsWith('c-mål')) {
    
    let borderColor = '#facc15'; // Default for C-Mål
    let labelContent = 'C-Mål';   // Default label for C-Mål

    if (planText.includes('a-mål')) {
        borderColor = '#e11d48';
        labelContent = 'A-Mål';
    } else if (planText.includes('b-mål')) {
        borderColor = '#f97316';
        labelContent = 'B-Mål';
    }

        // Bruger nu den simple 'labelContent' i stedet for den fulde tekst
        raceAnnotations[day.date] = { 
            type: 'line', 
            xMin: day.date, 
            xMax: day.date, 
            borderColor, 
            borderWidth: 2, 
            label: { 
                content: labelContent, // DEN RETTEDE DEL
                display: true, 
                position: 'start', 
                yAdjust: -10 
            } 
        };
    }
    });

    // NYT: Tilføjer "I dag"-linjen
    raceAnnotations['todayLine'] = {
        type: 'line',
        xMin: today,
        xMax: today,
        borderColor: '#22c55e',
        borderWidth: 2,
        borderDash: [6, 6],
        label: { content: 'I dag', display: true, position: 'end', yAdjust: 10, font: { weight: 'bold' } }
    };

    planTimelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Fremtidig fitness (CTL)', data: ctlData, borderColor: '#0284c7', borderWidth: 2.5, pointRadius: 0, tension: 0.4 },
                { label: 'Fremtidig træthed (ATL)', data: atlData, borderColor: '#ef4444', borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
                { label: 'Fremtidig form (TSB)', data: tsbData, borderColor: '#22c55e', borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: { target: 'origin', above: 'rgba(34, 197, 94, 0.1)', below: 'rgba(239, 68, 68, 0.1)' } }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'week' } } }, plugins: { annotation: { annotations: raceAnnotations } } }
    });
}

function renderWeek(weekIndex) {
    const weeklyBarChart = document.getElementById('weekly-bar-chart');
    const weeklyOverviewTitle = document.getElementById('weekly-overview-title');
    const planDetailsView = document.getElementById('plan-details-view');
    if (!weeklyBarChart || !weeklyOverviewTitle || !planDetailsView) return;
    
    const mondayKey = weeks[weekIndex];
    const weekDays = activePlan.filter(d => getStartOfWeekKey(new Date(d.date)) === mondayKey);
    
    // RETTET: Titelformat
    const mondayDate = new Date(mondayKey);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const formatDate = (d) => `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
    weeklyOverviewTitle.textContent = `Træningsuge ${getWeekNumberForDisplay(mondayDate)}, ${formatDate(mondayDate)} til ${formatDate(sundayDate)}`;

    // RETTET: Søjlediagram-logik
    weeklyBarChart.innerHTML = weekDays.map(day => {
        const dayDate = new Date(day.date);
        const workouts = day.plan.split('+').map(p => p.trim());
        let barHtml = '';

        if (workouts.length > 1) { // Stakkede søjler
            const workoutDetails = workouts.map(p => ({ plan: p, tss: estimateTssFromPlan(p) })).sort((a,b) => a.tss - b.tss);
            workoutDetails.forEach(wd => {
                const details = getWorkoutDetails(wd.plan);
                const loadPercentage = Math.min(100, (wd.tss / 150) * 100);
                barHtml += `<div class="bar-segment" style="height: ${loadPercentage}%; background-color: ${details.color};" title="${wd.plan}">
                                <div class="bar-text">${details.type}<br>${details.rpe}</div>
                            </div>`;
            });
        } else { // Enkelt søjle
            const tss = estimateTssFromPlan(day.plan);
            const details = getWorkoutDetails(day.plan);
            const loadPercentage = Math.min(100, (tss / 150) * 100);
            if (details.type !== 'Hvile') {
                 barHtml = `<div class="bar-segment" style="height: ${loadPercentage}%; background-color: ${details.color};" title="${day.plan}">
                                <div class="bar-text">${details.type}<br>${details.rpe}</div>
                            </div>`;
            }
        }
        
        // RETTET: Label under søjlen
        return `<div class="text-center">
                    <div class="h-48 flex flex-col-reverse bg-gray-100 rounded">${barHtml}</div>
                    <p class="text-sm mt-1 font-semibold">${dayDate.toLocaleDateString('da-DK', { weekday: 'short' })} ${dayDate.getDate()}/${dayDate.getMonth() + 1}</p>
                </div>`;
    }).join('');

    // RETTET: Detaljeret plan-liste
    planDetailsView.innerHTML = `<h4 class="font-bold text-lg mb-2">Detaljeret Plan: Uge ${getWeekNumberForDisplay(mondayDate)}</h4>` + 
        weekDays.map(day => {
            const d = new Date(day.date);
            const dateString = `${d.getDate()}/${d.getMonth() + 1}`;
            const dayString = d.toLocaleDateString('da-DK', { weekday: 'long' });
            return `<div class="day-row"><strong>${dayString} ${dateString}:</strong> <span>${day.plan}</span></div>`;
        }).join('');
}

function renderPlanPage() {
    const planContainer = document.querySelector('#plan.page');
    if (!planContainer) return;
    
    if (!activePlan || activePlan.length === 0) {
        if (planTimelineChart) planTimelineChart.destroy();
        const title = document.getElementById('weekly-overview-title');
        if (title) title.textContent = 'Ingen aktiv plan';
        const barChart = document.getElementById('weekly-bar-chart');
        if (barChart) barChart.innerHTML = '';
        const details = document.getElementById('plan-details-view');
        if(details) details.innerHTML = '<p class="text-center text-gray-500">Importer en plan for at starte.</p>';
        return;
    }

    weeks = [...new Set(activePlan.map(d => getStartOfWeekKey(new Date(d.date))))].sort();
    currentWeekIndex = weeks.findIndex(weekStart => new Date(weekStart) >= getStartOfWeekKey(new Date())) || 0;
    if (currentWeekIndex === -1) currentWeekIndex = 0;
    
    renderPlanTimelineChart();
    renderWeek(currentWeekIndex);
}

// --- INITIALISERING ---
export function initializePlanPage() {
    const triggerButton = document.getElementById('trigger-plan-import-btn');
    const fileInput = document.getElementById('plan-file-input');
    
    triggerButton?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await saveActivePlan(file.name, JSON.parse(e.target.result));
                location.reload();
            } catch (error) { alert("Ugyldig planfil."); }
        };
        reader.readAsText(file);
    });

    document.getElementById('reset-plan-btn')?.addEventListener('click', async () => {
        if (confirm("Er du sikker på, at du vil slette den aktive plan?")) {
            await saveActivePlan('Ingen plan', []);
            location.reload();
        }
    });

    document.getElementById('prev-week-btn')?.addEventListener('click', () => {
        if (currentWeekIndex > 0) renderWeek(--currentWeekIndex);
    });
    document.getElementById('next-week-btn')?.addEventListener('click', () => {
        if (currentWeekIndex < weeks.length - 1) renderWeek(++currentWeekIndex);
    });

    renderPlanPage();
}

export function getActivePlan() {
    return activePlan;
}