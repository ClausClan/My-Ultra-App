// planManager.js

let activePlan = [];
let activePlanName = '';
let planTimelineChart = null; // Vigtig for at kunne opdatere grafen
let currentWeekIndex = 0;
let weeks = [];

// --- HJÆLPEFUNKTIONER TIL VISNING ---

function estimateTssFromPlan(planText) {
    if (!planText) return 0;
    const text = planText.toLowerCase();
    if (text.includes('a-mål')) return 150;
    if (text.includes('b-mål')) return 120;
    if (text.includes('c-mål')) return 90;
    if (text.includes('hvile') || text.includes('restitution')) return 15;
    let baseTss = 50; // Default
    if (text.includes('langtur')) baseTss = 75;
    if (text.includes('tempo') || text.includes('intervaller')) baseTss = 90;
    return baseTss;
}

function getStartOfWeekKey(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
}

function getWeekNumberForDisplay(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

// --- DATAHÅNDTERING (Kommunikerer med backenden) ---

async function saveActivePlan(planName, planData) { /* ... uændret fra før ... */ }

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

// --- VISNING AF PLAN-SIDEN (GENINDSAT) ---

function renderPlanTimelineChart() {
    const ctx = document.getElementById('planTimelineChart')?.getContext('2d');
    if (!ctx) return;
    if (planTimelineChart) planTimelineChart.destroy();
    if (!activePlan || activePlan.length === 0) return;

    const CTL_CONST = 42, ATL_CONST = 7;
    let ctl = 0, atl = 0;
    const ctlData = [], atlData = [], tsbData = [], raceAnnotations = {};

    activePlan.forEach(day => {
        const tss = estimateTssFromPlan(day.plan);
        ctl += (tss - ctl) / CTL_CONST;
        atl += (tss - atl) / ATL_CONST;
        ctlData.push({ x: day.date, y: ctl });
        atlData.push({ x: day.date, y: atl });
        tsbData.push({ x: day.date, y: ctl - atl });

        const planText = day.plan.toLowerCase();
        if (day.isRaceDay || planText.includes('mål')) {
            let borderColor = '#facc15'; // C-Mål
            if (planText.includes('a-mål')) borderColor = '#e11d48';
            if (planText.includes('b-mål')) borderColor = '#f97316';
            raceAnnotations[day.date] = { type: 'line', xMin: day.date, xMax: day.date, borderColor, borderWidth: 2, label: { content: day.plan.split(':')[0], display: true, position: 'start' } };
        }
    });

    planTimelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Fremtidig fitness (CTL)', data: ctlData, borderColor: '#0284c7', borderWidth: 2, pointRadius: 0, tension: 0.4 },
                { label: 'Fremtidig træthed (ATL)', data: atlData, borderColor: '#e11d48', borderWidth: 1, pointRadius: 0, tension: 0.4 },
                { label: 'Fremtidig form (TSB)', data: tsbData, borderColor: '#16a34a', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: { target: 'origin', above: 'rgba(22, 163, 74, 0.1)', below: 'rgba(225, 29, 72, 0.1)' } }
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

    weeklyOverviewTitle.textContent = `Ugentligt Overblik: Uge ${weekNum}, ${mondayDate.getFullYear()}`;
    weeklyBarChart.innerHTML = weekDays.map(day => {
        const tss = estimateTssFromPlan(day.plan);
        const loadPercentage = Math.min(100, (tss / 150) * 100);
        const dayDate = new Date(day.date);
        const dayInitial = new Intl.DateTimeFormat('da-DK', { weekday: 'short' }).format(dayDate).charAt(0).toUpperCase();
        return `<div class="text-center">
                    <div class="h-48 flex flex-col-reverse bg-gray-100 rounded">
                        <div class="bg-blue-500 text-white text-xs font-bold flex items-center justify-center" style="height: ${loadPercentage}%" title="${day.plan} (TSS: ~${tss})">${tss > 20 ? day.plan.match(/\b(\w+)\b/)[0] : ''}</div>
                    </div>
                    <p class="text-sm mt-1">${dayInitial} ${dayDate.getDate()}.</p>
                </div>`;
    }).join('');

    planDetailsView.innerHTML = `<h4 class="font-bold text-lg mb-2">Detaljeret Plan: Uge ${weekNum}</h4>` + weekDays.map(day => {
        return `<div class="day-row"><strong>${new Date(day.date).toLocaleDateString('da-DK', { weekday: 'long' })}:</strong> <span>${day.plan}</span></div>`;
    }).join('');
}

function renderPlanPage() {
    const planContainer = document.getElementById('plan');
    if (!planContainer.classList.contains('active')) return;
    
    if (!activePlan || activePlan.length === 0) {
        if (planTimelineChart) planTimelineChart.destroy();
        document.getElementById('weekly-overview-title').textContent = 'Ingen aktiv plan';
        document.getElementById('weekly-bar-chart').innerHTML = '';
        document.getElementById('plan-details-view').innerHTML = '<p class="text-center text-gray-500">Importer en plan for at starte.</p>';
        return;
    }

    weeks = [...new Set(activePlan.map(d => getStartOfWeekKey(new Date(d.date))))].sort();
    currentWeekIndex = 0;
    
    renderPlanTimelineChart();
    renderWeek(currentWeekIndex);
}

// --- INITIALISERING ---

export function initializePlanPage() {
    const triggerButton = document.getElementById('trigger-plan-import-btn');
    const fileInput = document.getElementById('plan-file-input');
    
    triggerButton?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (event) => { /* ... uændret ... */ });
    document.getElementById('reset-plan-btn')?.addEventListener('click', async () => { /* ... uændret ... */ });

    document.getElementById('prev-week-btn')?.addEventListener('click', () => {
        if (currentWeekIndex > 0) {
            currentWeekIndex--;
            renderWeek(currentWeekIndex);
        }
    });
    document.getElementById('next-week-btn')?.addEventListener('click', () => {
        if (currentWeekIndex < weeks.length - 1) {
            currentWeekIndex++;
            renderWeek(currentWeekIndex);
        }
    });
    
    // Når Plan-siden initialiseres, tegn den plan, der er hentet ved opstart
    renderPlanPage();
}

export function getActivePlan() {
    return activePlan;
}