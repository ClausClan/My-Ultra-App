// analyseManager.js - FULD VERSION MED ALLE FORBEDRINGER (15. AUGUST 2025)

import { getActivePlan } from './planManager.js';
import { getDailyLogs } from './calendarManager.js';
import { estimateTssFromPlan } from './utils.js'; // Bruger nu den centrale funktion

let performanceChart = null;
let complianceChart = null;
let raceReadinessChart = null;
let hrvTrendChart = null;
let rhrTrendChart = null;

// --- HJÆLPEFUNKTIONER ---
function calculateActualTss(log) {
    if (log && log.pte) return log.pte * 20;
    return 0;
}
function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// --- HOVEDFUNKTION TIL AT TEGNE ALLE GRAFER ---
async function renderAllAnalyseCharts() {
    const activePlan = getActivePlan();
    const allLogs = getDailyLogs();
    
    let userProfile = {};
    try {
        const response = await fetch('/api/get-profile');
        if (response.ok) userProfile = await response.json();
    } catch (error) {
        console.error("Kunne ikke hente profil til analyse:", error);
    }
    
    renderPerformanceChart(allLogs, activePlan, userProfile);
}

// --- GRAF-SPECIFIKKE FUNKTIONER ---
function renderPerformanceChart(allLogs, activePlan, userProfile) {
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;
    if (performanceChart) performanceChart.destroy();
    if (!activePlan || activePlan.length === 0) return;

    let ctl = parseFloat(userProfile?.startingCtl) || 0;
    let atl = parseFloat(userProfile?.startingAtl) || 0;

    const CTL_CONST = 42, ATL_CONST = 7;
    const ctlData = [], atlData = [], tsbData = [];
    const raceAnnotations = {};
    const today = new Date().toISOString().split('T')[0];
    
    const startDate = new Date(activePlan[0].date);
    const endDate = new Date(activePlan[activePlan.length - 1].date);
    const logsMap = new Map(allLogs.map(log => [log.date, log]));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateKey(d);
        let tss = 0;

        if (dateKey < today) {
            const logForDay = logsMap.get(dateKey);
            tss = calculateActualTss(logForDay);
        } else {
            const planForDay = activePlan.find(p => p.date === dateKey);
            tss = estimateTssFromPlan(planForDay?.plan);
        }
        
        ctl += (tss - ctl) / CTL_CONST;
        atl += (tss - atl) / ATL_CONST;
        
        ctlData.push({ x: dateKey, y: ctl });
        atlData.push({ x: dateKey, y: atl });
        tsbData.push({ x: dateKey, y: ctl - atl });

        const planForDay = activePlan.find(p => p.date === dateKey);
        if (planForDay) {
            const planText = planForDay.plan.toLowerCase();
// --- VORES DETEKTIV-LINJE ---
            if (planText.includes('mål')) {
                console.log(`Fandt en måldag (${dateKey}): "${planText}"`);
            }
// -----------------------------
            if (planText.startsWith('a-mål:') || planText.startsWith('b-mål:') || planText.startsWith('c-mål:')) {
                let borderColor = '#facc15', labelContent = 'C-Mål';
                if (planText.startsWith('a-mål:')) { borderColor = '#e11d48'; labelContent = 'A-Mål'; }
                else if (planText.startsWith('b-mål:')) { borderColor = '#f97316'; labelContent = 'B-Mål'; }
                raceAnnotations[labelContent + '_' + dateKey] = { type: 'line', xMin: dateKey, xMax: dateKey, borderColor, borderWidth: 2, label: { content: labelContent, display: true, position: 'start', yAdjust: -10 } };
            }
        }
    }

    const formZones = {
        peakZone: { type: 'box', yMin: 15, yMax: 25, backgroundColor: 'rgba(250, 204, 21, 0.15)', borderColor: 'transparent', label: { content: 'Peak', display: true, position: 'start', color: 'rgba(120, 90, 0, 0.5)', font: { size: 10 } } },
        freshZone: { type: 'box', yMin: 5, yMax: 15, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'transparent', label: { content: 'Friskhed', display: true, position: 'start', color: 'rgba(0, 100, 0, 0.5)', font: { size: 10 } } },
        ProgressZone: { type: 'box', yMin: -30, yMax: -10, backgroundColor: 'rgba(182, 90, 15, 0.1)', borderColor: 'transparent', label: { content: 'Progression', display: true, position: 'start', color: 'rgba(225, 79, 6, 0.88)', font: { size: 10 } } },    
    };
    
    const todayLine = {
        todayLine: { type: 'line', xMin: today, xMax: today, borderColor: '#334155', borderWidth: 2, borderDash: [6, 6], label: { content: 'I dag', display: true, position: 'end', font: { weight: 'bold' } } }
    };

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Fitness (CTL)', data: ctlData, borderColor: '#0284c7', borderWidth: 2.5, pointRadius: 0, tension: 0.4 },
                { label: 'Træthed (ATL)', data: atlData, borderColor: '#ef4444', borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
                { label: 'Form (TSB)', data: tsbData, borderColor: '#22c55e', borderWidth: 2, pointRadius: 0, tension: 0.4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { type: 'time', time: { unit: 'week' } }, y: { title: { display: true, text: 'Score' } } },
            plugins: {
                title: { display: true, text: 'Progression: Aktuel vs. Planlagt', font: { size: 16 } },
                annotation: {
                    annotations: { ...formZones, ...raceAnnotations, ...todayLine, ...ProgressZone }
                }
            }
        }
    });
}

// --- INITIALISERING ---
export function initializeAnalysePage() {
    const analysePage = document.getElementById('analyse');
    if (!analysePage) return;
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            renderAllAnalyseCharts();
            observer.unobserve(analysePage);
        }
    }, { threshold: 0.1 });
    observer.observe(analysePage);
}