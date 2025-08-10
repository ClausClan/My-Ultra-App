import { getActivePlan } from './planManager.js';

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

function estimateTssFromPlan(planText) {
    if (!planText) return 0;
    const text = planText.toLowerCase();
    if (text.includes('a-mål')) return 150;
    if (text.includes('b-mål')) return 120;
    if (text.includes('c-mål')) return 90;
    if (text.includes('generalprøve')) return 130;
    if (text.includes('hvile') || text.includes('restitution')) return 15;
    let durationInMinutes = 0;
    const timeMatch = text.match(/(\d+(\.\d+)?)\s*(t|min)/);
    if (timeMatch) {
        const value = parseFloat(timeMatch[1]);
        durationInMinutes = timeMatch[3] === 't' ? value * 60 : value;
    }
    let baseTssPerHour = 50;
    if (text.includes('langtur')) baseTssPerHour = 65;
    if (text.includes('tempo') || text.includes('rpe 7-8')) baseTssPerHour = 90;
    if (text.includes('bakke') || text.includes('intervaller')) baseTssPerHour = 105;
    if (text.includes('let løb') || text.includes('rpe 3-4')) baseTssPerHour = 50;
    if (text.includes('styrke')) baseTssPerHour = 35;
    if (durationInMinutes > 0) return Math.round((baseTssPerHour / 60) * durationInMinutes);
    return baseTssPerHour;
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

function renderPerformanceChart() {
    const activePlan = getActivePlan();
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;
    if (performanceChart) performanceChart.destroy();

    if (!activePlan || activePlan.length === 0) {
        ctx.fillText("Ingen aktiv plan fundet.", ctx.canvas.width / 2, 20);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const raceGoals = [];

    const hybridTssSeries = activePlan.map((day) => {
        const planText = day.plan.toLowerCase();
        if (planText.startsWith('a-mål') || planText.startsWith('b-mål') || planText.startsWith('c-mål')) {
            let borderColor = '#facc15';
            if (planText.startsWith('a-mål')) borderColor = '#e11d48';
            if (planText.startsWith('b-mål')) borderColor = '#f97316';
            raceGoals.push({ date: day.date, label: day.plan.split(':')[0], borderColor: borderColor });
        }
        if (day.date <= today) {
            const logData = JSON.parse(localStorage.getItem(`log-${day.date}`));
            const actualTss = calculateActualTss(logData);
            return actualTss !== null ? actualTss : estimateTssFromPlan(day.plan);
        }
        return estimateTssFromPlan(day.plan);
    });

    const CTL_CONST = 42, ATL_CONST = 7;
    let ctl = 0, atl = 0;
    const ctlData = [], atlData = [], tsbData = [];

    activePlan.forEach((day, index) => {
        const tss = hybridTssSeries[index];
        ctl += (tss - ctl) / CTL_CONST;
        atl += (tss - atl) / ATL_CONST;
        ctlData.push({ x: day.date, y: ctl });
        atlData.push({ x: day.date, y: atl });
        tsbData.push({ x: day.date, y: ctl - atl });
    });

    const annotations = raceGoals.reduce((acc, goal) => {
        acc[goal.label] = { type: 'line', xMin: goal.date, xMax: goal.date, borderColor: goal.borderColor, borderWidth: 2, label: { content: goal.label, display: true, position: 'start', font: { weight: 'bold' } } };
        return acc;
    }, {});
    annotations['todayLine'] = { type: 'line', xMin: today, xMax: today, borderColor: '#22c55e', borderWidth: 3, borderDash: [6, 6], label: { content: 'I dag', display: true, position: 'end', yAdjust: -15, font: { weight: 'bold' }, backgroundColor: 'rgba(34, 197, 94, 0.8)', color: 'white', borderRadius: 4, padding: 4 } };
    
    const segmentOptions = (color) => ({ segment: { borderColor: ctx => ctx.p1.parsed.x > new Date(today).valueOf() ? color.replace(')', ', 0.5)').replace('rgb', 'rgba') : color, borderDash: ctx => ctx.p1.parsed.x > new Date(today).valueOf() ? [6, 6] : undefined } });

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Fitness (CTL)', data: ctlData, borderColor: '#0284c7', borderWidth: 3, pointRadius: 0, tension: 0.4, ...segmentOptions('rgb(2, 132, 199)') },
                { label: 'Træthed (ATL)', data: atlData, borderColor: '#e11d48', borderWidth: 2, pointRadius: 0, tension: 0.4, ...segmentOptions('rgb(225, 29, 72)') },
                { label: 'Form (TSB)', data: tsbData, borderColor: '#16a34a', borderWidth: 2, pointRadius: 0, tension: 0.4, ...segmentOptions('rgb(22, 163, 74)') }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Performance Management Chart (Aktuel vs. Planlagt)', font: { size: 18 } }, annotation: { annotations: annotations } },
            scales: { x: { type: 'time', time: { unit: 'week' } }, y: { title: { display: true, text: 'Score' } } }
        }
    });
}

function renderComplianceChart() {
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
}

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