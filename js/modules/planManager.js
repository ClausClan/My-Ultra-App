// planManager.js - FULD VERSION MED DATABASE OG KORREKT VISNING (14. AUGUST 2025)

let activePlan = [];
let activePlanName = '';
let planTimelineChart = null;
let currentWeekIndex = 0;
let weeks = [];

// --- HJÆLPEFUNKTIONER ---
function estimateTssFromPlan(planText) {
    if (!planText) return 0;
    const text = planText.toLowerCase();

    // Tjek for løb (A, B, C-mål) først
    if (text.includes('a-mål')) return 150;
    if (text.includes('b-mål')) return 120;
    if (text.includes('c-mål')) return 90;
    if (text.includes('hvile') || text.includes('restitution')) return 15;

    let durationInMinutes = 0;
    // Tjek for varighed i timer (f.eks. "2t", "1.5 t")
    const hourMatch = text.match(/(\d+(\.\d+)?)\s*t/);
    if (hourMatch) {
        durationInMinutes = parseFloat(hourMatch[1]) * 60;
    } else {
        // Hvis ikke timer, tjek for minutter (f.eks. "90 min", "90min")
        const minMatch = text.match(/(\d+)\s*min/);
        if (minMatch) {
            durationInMinutes = parseInt(minMatch[1], 10);
        }
    }

    // Baseret på din mere videnskabelige model
    let baseTssPerHour = 50; // Default for "andet"
    if (text.includes('langtur')) baseTssPerHour = 65;
    if (text.includes('tempo') || text.includes('rpe 7-8')) baseTssPerHour = 90;
    if (text.includes('bakke') || text.includes('intervaller')) baseTssPerHour = 105;
    if (text.includes('let løb') || text.includes('rpe 3-4')) baseTssPerHour = 50;
    if (text.includes('styrke')) baseTssPerHour = 35;

    if (durationInMinutes > 0) {
        return Math.round((baseTssPerHour / 60) * durationInMinutes);
    }
    
    // Fallback hvis ingen varighed er specificeret (returnerer bare base-tss for 1 time)
    return baseTssPerHour;
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
        if (day.isRaceDay || planText.includes('mål')) {
            let borderColor = '#facc15';
            if (planText.includes('a-mål')) borderColor = '#e11d48';
            if (planText.includes('b-mål')) borderColor = '#f97316';
            raceAnnotations[day.date] = { type: 'line', xMin: day.date, xMax: day.date, borderColor, borderWidth: 2, label: { content: day.plan.split(':')[0], display: true, position: 'start', yAdjust: -10 } };
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
    const mondayDate = new Date(mondayKey);
    const weekNum = getWeekNumberForDisplay(mondayDate);

    weeklyOverviewTitle.textContent = `Uge ${weekNum}, ${mondayDate.getFullYear()}`;
    weeklyBarChart.innerHTML = weekDays.map(day => {
        const tss = estimateTssFromPlan(day.plan);
        const loadPercentage = Math.min(100, (tss / 150) * 100);
        const dayDate = new Date(day.date);
        return `<div class="text-center">
                    <div class="h-48 flex flex-col-reverse bg-gray-100 rounded" title="${day.plan} (Est. TSS: ${tss})">
                        <div class="bg-blue-500" style="height: ${loadPercentage}%"></div>
                    </div>
                    <p class="text-sm mt-1">${dayDate.toLocaleDateString('da-DK', { weekday: 'short' })}</p>
                </div>`;
    }).join('');

    planDetailsView.innerHTML = `<h4 class="font-bold text-lg mb-2">Detaljeret Plan: Uge ${weekNum}</h4>` + weekDays.map(day => `<div class="day-row"><strong>${new Date(day.date).toLocaleDateString('da-DK', { weekday: 'long' })}:</strong> <span>${day.plan}</span></div>`).join('');
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