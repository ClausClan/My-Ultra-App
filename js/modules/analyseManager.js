// analyseManager.js - FULD VERSION MED ALLE FORBEDRINGER (15. AUGUST 2025)

import { getActivePlan } from './planManager.js';
import { getDailyLogs } from './calendarManager.js';
import { estimateTssFromPlan } from './utils.js'; // Bruger nu den centrale funktion
import { formatDateKey } from './utils.js';

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
//function formatDateKey(date) {
//    return date.toISOString().split('T')[0];
//}

function getStartOfWeekKey(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
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
    renderComplianceChart(allLogs, activePlan);
    renderRaceReadinessChart(activePlan);
    renderRecoveryTrendCharts(allLogs);
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
    // Seks nye arrays til at opdele data i fortid og fremtid
    const ctlPast = [], ctlFuture = [], atlPast = [], atlFuture = [], tsbPast = [], tsbFuture = [];
    const raceAnnotations = {};
    const today = new Date();
    const todayKey = formatDateKey(today);
    
    const startDate = new Date(activePlan[0].date);
    const endDate = new Date(activePlan[activePlan.length - 1].date);
    endDate.setHours(12, 0, 0, 0); // Sætter tiden til middag for at undgå tidszone-problemer
    const logsMap = new Map(allLogs.map(log => [log.date, log]));

    // RETTET: Sikrere løkke, der garanterer, at sidste dag kommer med
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateKey(d);
        let tss = 0;

        const isPast = dateKey < todayKey;

        if (isPast) {
            const logForDay = logsMap.get(dateKey);
            tss = calculateActualTss(logForDay);
        } else {
            const planForDay = activePlan.find(p => p.date === dateKey);
            tss = estimateTssFromPlan(planForDay?.plan);
        }
        
        ctl += (tss - ctl) / CTL_CONST;
        atl += (tss - atl) / ATL_CONST;
        const tsb = ctl - atl;
        
        // Fyld data i de korrekte fortid/fremtid arrays
        if (isPast) {
            ctlPast.push({ x: dateKey, y: ctl });
            atlPast.push({ x: dateKey, y: atl });
            tsbPast.push({ x: dateKey, y: tsb });
            // Sæt et startpunkt for fremtids-grafen for at forbinde linjerne
            if (formatDateKey(new Date(d.getTime() + 86400000)) >= todayKey) {
                 ctlFuture.push({ x: dateKey, y: ctl });
                 atlFuture.push({ x: dateKey, y: atl });
                 tsbFuture.push({ x: dateKey, y: tsb });
            }
        } else {
            ctlFuture.push({ x: dateKey, y: ctl });
            atlFuture.push({ x: dateKey, y: atl });
            tsbFuture.push({ x: dateKey, y: tsb });
        }

        const planForDay = activePlan.find(p => p.date === dateKey);
        if (planForDay && planForDay.plan) {
            const planText = planForDay.plan.trim().toLowerCase();
            if (planText.startsWith('a-mål:') || planText.startsWith('b-mål:') || planText.startsWith('c-mål:')) {
                let borderColor = '#facc15', labelContent = 'C-Mål';
                if (planText.startsWith('a-mål:')) { borderColor = '#e11d48'; labelContent = 'A-Mål'; }
                else if (planText.startsWith('b-mål:')) { borderColor = '#f97316'; labelContent = 'B-Mål'; }
                raceAnnotations[labelContent + '_' + dateKey] = { type: 'line', xMin: dateKey, xMax: dateKey, borderColor, borderWidth: 2, label: { content: labelContent, display: true, position: 'start', yAdjust: -10 } };
            }
        }
    }

    const ProgressZone = {
        type: 'box', yMin: -30, yMax: -10, backgroundColor: 'rgba(182, 90, 15, 0.1)', borderColor: 'transparent',label: { content: 'Progression', display: true, position: 'start', color: 'rgba(225, 79, 6, 0.88)', font: { size: 10 } }
    };

    const formZones = {
        peakZone: { type: 'box', yMin: 15, yMax: 25, backgroundColor: 'rgba(250, 204, 21, 0.15)', borderColor: 'transparent', label: { content: 'Peak', display: true, position: 'start', color: 'rgba(120, 90, 0, 0.5)', font: { size: 10 } } },
        freshZone: { type: 'box', yMin: 5, yMax: 15, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'transparent', label: { content: 'Friskhed', display: true, position: 'start', color: 'rgba(0, 100, 0, 0.5)', font: { size: 10 } } },
    };
    
    const todayLine = {
        todayLine: { type: 'line', xMin: today, xMax: today, borderColor: '#334155', borderWidth: 2, borderDash: [6, 6], label: { content: 'I dag', display: true, position: 'end', font: { weight: 'bold' } } }
    };

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                // OPDATERET: Seks datasets for en detaljeret legende
                { label: 'Fitness', data: ctlPast, borderColor: '#0284c7', borderWidth: 2.5, pointRadius: 0, tension: 0.4 },
                { label: 'Fremtidig Fitness', data: ctlFuture, borderColor: '#0284c7', borderWidth: 2.5, pointRadius: 0, tension: 0.4, borderDash: [6, 6] },
                { label: 'Træthed', data: atlPast, borderColor: '#ef4444', borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
                { label: 'Fremtidig Træthed', data: atlFuture, borderColor: '#ef4444', borderWidth: 1.5, pointRadius: 0, tension: 0.4, borderDash: [6, 6] },
                { label: 'Form', data: tsbPast, borderColor: '#22c55e', borderWidth: 2, pointRadius: 0, tension: 0.4 },
                { label: 'Fremtidig Form', data: tsbFuture, borderColor: '#22c55e', borderWidth: 2, pointRadius: 0, tension: 0.4, borderDash: [6, 6] }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { type: 'time', time: { unit: 'week' } }, y: { title: { display: true, text: 'Score' } } },
            plugins: {
                title: { display: true, text: 'Progression: Aktuel vs. Planlagt', font: { size: 16 } },
                // OPDATERET: Filtrer tomme datasets fra legenden
                legend: {
                    labels: {
                        filter: item => item.text && !item.text.includes('undefined')
                    }
                },
                annotation: {
                    annotations: { ...formZones, ...raceAnnotations, ...todayLine, ProgressZone }
                }
            }
        }
    });
}

function renderComplianceChart(allLogs, activePlan) {
    const ctx = document.getElementById('complianceChart')?.getContext('2d');
    if (!ctx) return;
    if (complianceChart) complianceChart.destroy();

    const weeklyData = {};

    // Udfyld med planlagte data
    activePlan.forEach(day => {
        const weekStart = getStartOfWeekKey(new Date(day.date));
        if (!weeklyData[weekStart]) weeklyData[weekStart] = { planned: 0, actual: 0 };
        weeklyData[weekStart].planned += estimateTssFromPlan(day.plan);
    });

    // Udfyld med faktiske data
    allLogs.forEach(log => {
        const weekStart = getStartOfWeekKey(new Date(log.date));
        if (weeklyData[weekStart]) { // Sørg for kun at tilføje, hvis ugen er i planen
            weeklyData[weekStart].actual += calculateActualTss(log);
        }
    });

    // --- NY LOGIK TIL AT VÆLGE DE SENESTE 8 UGER ---
    const allWeeksSorted = Object.keys(weeklyData).sort();
    const today = new Date();
    
    // Find alle uger, der er startet op til og med i dag
    const pastAndCurrentWeeks = allWeeksSorted.filter(week => new Date(week) <= today);
    
    // Vælg de sidste 8 af disse uger
    const labels = pastAndCurrentWeeks.slice(-8); 
    // ------------------------------------------------

    const plannedTss = labels.map(week => weeklyData[week].planned);
    const actualTss = labels.map(week => weeklyData[week].actual);
    // Gør uge-etiketterne mere læselige
    const weekLabels = labels.map(week => {
        const date = new Date(week);
        return `Uge ${date.getWeek()}`;
    });

    complianceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekLabels,
            datasets: [
                { label: 'Planlagt TSS', data: plannedTss, backgroundColor: 'rgba(54, 162, 235, 0.5)' },
                { label: 'Faktisk TSS', data: actualTss, backgroundColor: 'rgba(75, 192, 192, 0.8)' }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Samlet TSS' } } }
        }
    });
}

// renderRaceReadinessChart
function renderRaceReadinessChart(activePlan) {
    const ctx = document.getElementById('raceReadinessChart')?.getContext('2d');
    if (!ctx) return;
    if (raceReadinessChart) raceReadinessChart.destroy();
    if (!activePlan || activePlan.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextGoal = activePlan.find(day => {
        const planText = day.plan.toLowerCase().trim();
        const isFutureOrToday = new Date(day.date) >= today;
        return isFutureOrToday && (planText.startsWith('a-mål:') || planText.startsWith('b-mål:') || planText.startsWith('c-mål:'));
    });

    if (!nextGoal) {
        if(ctx.canvas) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    let ctl = 0, atl = 0;
    const tsbData = [];
    activePlan.forEach(day => {
        const tss = estimateTssFromPlan(day.plan);
        ctl += (tss - ctl) / 42;
        atl += (tss - atl) / 7;
        if (new Date(day.date) <= new Date(nextGoal.date)) {
            tsbData.push({ x: day.date, y: ctl - atl });
        }
    });
    
    const taperStartDate = new Date(nextGoal.date);
    taperStartDate.setDate(taperStartDate.getDate() - 28);
    const taperTsbData = tsbData.filter(d => new Date(d.x) >= taperStartDate);

    // Definition af alle tre zoner
    const allZones = {
        peakZone: { type: 'box', yMin: 15, yMax: 25, backgroundColor: 'rgba(250, 204, 21, 0.15)', borderColor: 'transparent', label: { content: 'Peak', display: true, position: 'start', color: 'rgba(120, 90, 0, 0.5)', font: { size: 10 } } },
        freshZone: { type: 'box', yMin: 5, yMax: 15, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'transparent', label: { content: 'Friskhed', display: true, position: 'start', color: 'rgba(0, 100, 0, 0.5)', font: { size: 10 } } },
        ProgressZone: { type: 'box', yMin: -30, yMax: -10, backgroundColor: 'rgba(182, 90, 15, 0.1)', borderColor: 'transparent', label: { content: 'Progression', display: true, position: 'start', color: 'rgba(225, 79, 6, 0.88)', font: { size: 10 } } },
        raceDay: { type: 'line', xMin: nextGoal.date, xMax: nextGoal.date, borderColor: '#ef4444', borderWidth: 2, label: { content: 'Mål', display: true } }
    };

    raceReadinessChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Forventet Form (TSB)',
                data: taperTsbData,
                borderColor: '#22c55e',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { type: 'time', time: { unit: 'day' } } },
            plugins: {
                title: { display: true, text: `Formtopning mod: ${nextGoal.plan}` },
                // OPDATERET: Viser nu alle zoner
                annotation: {
                    annotations: allZones
                }
            }
        }
    });
}

function renderRecoveryTrendCharts(allLogs) {
    const hrvCtx = document.getElementById('hrvTrendChart')?.getContext('2d');
    const rhrCtx = document.getElementById('rhrTrendChart')?.getContext('2d');
    if (!hrvCtx || !rhrCtx) return;
    if (hrvTrendChart) hrvTrendChart.destroy();
    if (rhrTrendChart) rhrTrendChart.destroy();

    const calculateMovingAverage = (data, windowSize) => {
        return data.map((_, i, arr) => {
            const window = arr.slice(Math.max(0, i - windowSize + 1), i + 1);
            const sum = window.reduce((acc, val) => acc + val.y, 0);
            return { x: data[i].x, y: sum / window.length };
        });
    };

    const hrvData = allLogs.filter(l => l.hrv).map(l => ({ x: l.date, y: l.hrv }));
    hrvTrendChart = new Chart(hrvCtx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Daglig HRV', data: hrvData, borderColor: 'rgba(34, 197, 94, 0.5)', pointRadius: 2 },
                { label: '7-dages gns.', data: calculateMovingAverage(hrvData, 7), borderColor: '#22c55e', borderWidth: 2, pointRadius: 0 }
            ]
        }
    });

    const rhrData = allLogs.filter(l => l.rhr).map(l => ({ x: l.date, y: l.rhr }));
    rhrTrendChart = new Chart(rhrCtx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Daglig Hvilepuls', data: rhrData, borderColor: 'rgba(54, 162, 235, 0.5)', pointRadius: 2 },
                { label: '7-dages gns.', data: calculateMovingAverage(rhrData, 7), borderColor: '#36a2eb', borderWidth: 2, pointRadius: 0 }
            ]
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

// Helper til at få ugenummer
Date.prototype.getWeek = function() {
  var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};