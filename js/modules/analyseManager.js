import { getActivePlan } from './planManager.js';
import { getDailyLogs } from './calendarManager.js';
import { estimateTssFromPlan } from './utils.js';

// Globale variabler til at holde styr på graferne
let performanceChart = null;
let complianceChart = null;
let raceReadinessChart = null;
let hrvTrendChart = null;
let rhrTrendChart = null;

// --- UTILITY FUNCTIONS ---

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

function calculateActualTss(logData) {
    if (!logData) return null;
    if (logData.pte && parseFloat(logData.pte) > 0) {
        return parseFloat(logData.pte) * 12;
    }
    if (logData.duration && parseFloat(logData.duration) > 0) {
        const durationInHours = parseFloat(logData.duration) / 60;
        return durationInHours * 70;
    }
    return null;
}

// --- RENDER FUNCTIONS ---

// --- HOVEDFUNKTION TIL AT TEGNE ALLE GRAFER ---

async function renderAllAnalyseCharts() {
    // Hent alle de nødvendige data
    const activePlan = getActivePlan();
    const allLogs = getDailyLogs();
    
    // Hent profilen for at få start-værdier
    let userProfile = {};
    try {
        const response = await fetch('/api/get-profile');
        if (response.ok) userProfile = await response.json();
    } catch (error) {
        console.error("Kunne ikke hente profil til analyse:", error);
    }
    
    // Kald funktionerne til at tegne hver enkelt graf
    renderPerformanceChart(allLogs, activePlan, userProfile);
    // Her kan vi tilføje kald til de andre grafer senere
    // renderComplianceChart(allLogs, activePlan);
    // renderHrvTrendChart(allLogs);
}


// --- GRAF-SPECIFIKKE FUNKTIONER ---

function renderPerformanceChart(allLogs, activePlan, userProfile) {
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;
    if (performanceChart) performanceChart.destroy();
    if (!activePlan || activePlan.length === 0) {
        // Håndter tom tilstand
        return;
    }

    // Få start-værdier fra profilen, med 0 som fallback
    let ctl = userProfile?.startingCtl || 0;
    let atl = userProfile?.startingAtl || 0;

    const CTL_CONST = 42, ATL_CONST = 7;
    const ctlData = [], atlData = [], tsbData = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Byg en komplet datakalender fra starten af planen
    const startDate = new Date(activePlan[0].date);
    const endDate = new Date(activePlan[activePlan.length - 1].date);
    
    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateKey(d);
        let tss = 0;

        // Byg hybrid-TSS: Faktisk data før i dag, planlagt data efter i dag
        if (dateKey < today) {
            const logForDay = allLogs.find(log => log.date === dateKey);
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
    }

    // Opsætning af baggrunds-zoner for form
    const formZones = {
        peakZone: { yMin: 15, yMax: 25, backgroundColor: 'rgba(250, 204, 21, 0.1)', borderColor: 'transparent', label: { content: 'Peak', display: true, position: 'start', font: { size: 10 } } },
        freshZone: { yMin: 5, yMax: 15, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'transparent', label: { content: 'Frisk', display: true, position: 'start', font: { size: 10 } } },
    };

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Fitness (CTL)', data: ctlData, borderColor: '#0284c7', borderWidth: 2.5, pointRadius: 0 },
                { label: 'Træthed (ATL)', data: atlData, borderColor: '#ef4444', borderWidth: 1.5, pointRadius: 0 },
                { label: 'Form (TSB)', data: tsbData, borderColor: '#22c55e', borderWidth: 2, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { type: 'time', time: { unit: 'week' } } },
            plugins: {
                annotation: {
                    annotations: formZones // Indsæt de farvede zoner
                }
            }
        }
    });
}

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// --- INITIALISERING ---
export function initializeAnalysePage() {
    // Vi bruger en 'IntersectionObserver' til kun at tegne graferne, når Analyse-siden rent faktisk bliver synlig.
    // Det sparer ressourcer.
    const analysePage = document.getElementById('analyse');
    if (!analysePage) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            console.log("Analyse-siden er nu synlig. Tegner grafer...");
            renderAllAnalyseCharts();
            // Stop med at observere efter første gang for at spare yderligere ressourcer
            observer.unobserve(analysePage);
        }
    }, { threshold: 0.1 });

    observer.observe(analysePage);
}

/*function renderComplianceChart() {
    const activePlan = getActivePlan();
    const ctx = document.getElementById('complianceChart')?.getContext('2d');
    if (!ctx) return;
    if (complianceChart) complianceChart.destroy();
    
    if (!activePlan || activePlan.length === 0) return;

    const allWeeks = [...new Set(activePlan.map(d => getStartOfWeekKey(new Date(d.date))))].sort();
    const today = new Date();
    const currentWeekKey = getStartOfWeekKey(today);
    let currentWeekIndex = allWeeks.indexOf(currentWeekKey);
    if (currentWeekIndex === -1) { currentWeekIndex = allWeeks.length -1; }

    const startIndex = Math.max(0, currentWeekIndex - 4);
    const relevantWeeks = allWeeks.slice(startIndex, currentWeekIndex + 1);
    const labels = [], plannedTss = [], actualTss = [];

    relevantWeeks.forEach(weekKey => {
        const weekDate = new Date(weekKey);
        labels.push(`Uge ${getWeekNumberForDisplay(weekDate)}`);
        const daysInWeek = activePlan.filter(d => getStartOfWeekKey(new Date(d.date)) === weekKey);
        let totalPlannedTss = 0, totalActualTss = 0;
        daysInWeek.forEach(day => {
            totalPlannedTss += estimateTssFromPlan(day.plan);
            const logData = JSON.parse(localStorage.getItem(`log-${day.date}`));
            totalActualTss += calculateActualTss(logData) || 0;
        });
        plannedTss.push(totalPlannedTss);
        actualTss.push(totalActualTss);
    });

    complianceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Planlagt TSS', data: plannedTss, backgroundColor: 'rgba(2, 132, 199, 0.3)', borderColor: 'rgb(2, 132, 199)', borderWidth: 1 },
                { label: 'Faktisk TSS', data: actualTss, backgroundColor: 'rgba(22, 163, 74, 0.6)', borderColor: 'rgb(22, 163, 74)', borderWidth: 1 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Samlet ugentlig TSS' } } } }
    });
}

function renderRaceReadinessChart() {
    const activePlan = getActivePlan();
    const ctx = document.getElementById('raceReadinessChart')?.getContext('2d');
    if (!ctx) return;
    if (raceReadinessChart) raceReadinessChart.destroy();
    
    if (!activePlan || activePlan.length === 0) {
        ctx.font = "16px sans-serif"; ctx.fillStyle = "grey"; ctx.textAlign = "center";
        ctx.fillText("Ingen aktiv plan fundet.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextAGoal = activePlan.find(day => day.plan.toLowerCase().startsWith('a-mål') && new Date(day.date) >= today);

    if (!nextAGoal) {
        ctx.font = "16px sans-serif"; ctx.fillStyle = "grey"; ctx.textAlign = "center";
        ctx.fillText("Ingen kommende A-mål fundet i planen.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const CTL_CONST = 42, ATL_CONST = 7;
    let ctl = 0, atl = 0;
    const fullTsbSeries = [];
    activePlan.forEach(day => {
        const tss = estimateTssFromPlan(day.plan);
        ctl += (tss - ctl) / CTL_CONST;
        atl += (tss - atl) / ATL_CONST;
        if (new Date(day.date) <= new Date(nextAGoal.date)) {
             fullTsbSeries.push({ x: day.date, y: ctl - atl });
        }
    });

    const raceDate = new Date(nextAGoal.date);
    const taperStartDate = new Date(raceDate);
    taperStartDate.setDate(raceDate.getDate() - 41); 
    const taperTsbData = fullTsbSeries.filter(d => new Date(d.x) >= taperStartDate);

    raceReadinessChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{ label: 'Forventet Form (TSB)', data: taperTsbData, borderColor: '#0284c7', borderWidth: 3, pointRadius: 2, tension: 0.1 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'd MMM' } } }, y: { beginAtZero: false, title: { display: true, text: 'Form Score (TSB)' } } },
            plugins: {
                title: { display: true, text: `Formtopning frem mod: ${nextAGoal.plan}` }, legend: { display: false },
                annotation: { annotations: {
                        peakZone: { type: 'box', yMin: 15, yMax: 25, backgroundColor: 'rgba(250, 204, 21, 0.2)', borderColor: 'rgba(250, 204, 21, 0.4)', label: { content: 'Peak Zone', display: true, position: 'start' } },
                        freshZone: { type: 'box', yMin: 0, yMax: 15, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' },
                        raceDay: { type: 'line', xMin: nextAGoal.date, xMax: nextAGoal.date, borderColor: '#e11d48', borderWidth: 2, label: { content: 'A-Mål', display: true, position: 'end' } }
                    }
                }
            }
        }
    });
}

function renderRecoveryCharts() {
    const activePlan = getActivePlan();
    const hrvCtx = document.getElementById('hrvTrendChart')?.getContext('2d');
    const rhrCtx = document.getElementById('rhrTrendChart')?.getContext('2d');
    if (hrvTrendChart) hrvTrendChart.destroy();
    if (rhrTrendChart) rhrTrendChart.destroy();

    if (!activePlan || activePlan.length === 0) return;

    const hrvDataPoints = [], rhrDataPoints = [];
    activePlan.forEach(day => {
        const logData = JSON.parse(localStorage.getItem(`log-${day.date}`));
        if (logData) {
            const hrv = parseFloat(logData.hrv);
            if (!isNaN(hrv) && hrv > 0) hrvDataPoints.push({ x: day.date, y: hrv });
            const rhr = parseFloat(logData.rhr);
            if (!isNaN(rhr) && rhr > 0) rhrDataPoints.push({ x: day.date, y: rhr });
        }
    });

    const calculateMovingAverage = (data, windowSize) => {
        return data.map((_, i, arr) => {
            const window = arr.slice(Math.max(0, i - windowSize + 1), i + 1);
            const sum = window.reduce((acc, val) => acc + val.y, 0);
            return { x: data[i].x, y: sum / window.length };
        });
    };

    if (hrvCtx) {
        hrvTrendChart = new Chart(hrvCtx, {
            type: 'line',
            data: { datasets: [
                { label: 'Daglig HRV', data: hrvDataPoints, borderColor: 'rgba(34, 197, 94, 0.2)', pointRadius: 3, pointBackgroundColor: 'rgba(34, 197, 94, 0.5)' },
                { label: '7-dages gns.', data: calculateMovingAverage(hrvDataPoints, 7), borderColor: 'rgb(34, 197, 94)', borderWidth: 3, tension: 0.3, pointRadius: 0 }
            ]},
            options: { scales: { x: { type: 'time', time: { unit: 'week' } }, y: { title: { display: true, text: 'HRV (ms)' } } } }
        });
    }

    if (rhrCtx) {
        rhrTrendChart = new Chart(rhrCtx, {
            type: 'line',
            data: { datasets: [
                { label: 'Daglig Hvilepuls', data: rhrDataPoints, borderColor: 'rgba(2, 132, 199, 0.2)', pointRadius: 3, pointBackgroundColor: 'rgba(2, 132, 199, 0.5)' },
                { label: '7-dages gns.', data: calculateMovingAverage(rhrDataPoints, 7), borderColor: 'rgb(2, 132, 199)', borderWidth: 3, tension: 0.3, pointRadius: 0 }
            ]},
            options: { scales: { x: { type: 'time', time: { unit: 'week' } }, y: { title: { display: true, text: 'Hvilepuls (slag/min)' } } } }
        });
    }
}*/

export function initializeAnalysePage() {
    const analyseButton = document.querySelector('.nav-btn[data-page="analyse"]');
    
    const renderAllAnalyseCharts = () => {
        setTimeout(() => {
            renderPerformanceChart();
            renderComplianceChart();
            renderRaceReadinessChart();
            renderRecoveryCharts();
        }, 50);
    };

    if (!analyseButton.dataset.listenerAttached) {
        analyseButton.dataset.listenerAttached = 'true';
        analyseButton.addEventListener('click', renderAllAnalyseCharts);
    }

    if (document.getElementById('analyse').classList.contains('active')) {
        renderAllAnalyseCharts();
    }
}