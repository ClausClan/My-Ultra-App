// chartManager.js - FULD DATABASE-DREVET VERSION (18. AUGUST 2025)

import { getDailyLogs } from './calendarManager.js';

let homePageCharts = {};

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

export function updateHomePageDashboard(allLogs) {
    if (!allLogs) return; // Sikkerhedstjek

    const logsMap = new Map(allLogs.map(log => [log.date, log]));

    const labels = [];
    const hrvData = [], rhrData = [], sleepData = [], vo2maxData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('da-DK', { weekday: 'short' }));
        
        const dateKey = formatDateKey(date);
        const dayData = logsMap.get(dateKey) || {};

        hrvData.push(dayData.hrv || null);
        rhrData.push(dayData.rhr || null);
        sleepData.push(dayData.sleep_quality || null);
        vo2maxData.push(dayData.vo2max || null);
    }

    Object.values(homePageCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });

    function createChart(elementId, chartType, data, title, yAxisLabel, color, extraOptions = {}) { /* ... uændret ... */ }

    createChart('hrvChart', 'line', hrvData, 'HRV', 'ms', '#27ae60');
    createChart('rhrChart', 'line', rhrData, 'Hvilepuls', 'slag/min', '#2980b9');
    createChart('sleepChart', 'bar', sleepData, 'Søvnkvalitet', 'Score (1-5)', '#8e44ad', { yScale: { min: 0, max: 5 } });
    createChart('vo2maxChart', 'line', vo2maxData, 'VO2max', 'ml/kg/min', '#e74c3c');
}

