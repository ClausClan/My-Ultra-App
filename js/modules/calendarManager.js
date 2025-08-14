// calendarManager.js - VERSION 13. AUGUST 2025

import { getActivePlan } from './planManager.js';
import { fetchActivities, fetchActivityDetails } from './stravaManager.js';

// --- GLOBALE VARIABLER ---
let currentDate = new Date();
let selectedDate = new Date();
let activePlan = [];
let allLogs = [];
let stravaActivities = [];

// --- HJÆLPEFUNKTIONER ---
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// --- RENDERING AF UI ---
function renderAll() {
    renderCalendar();
    renderWeeklyView();
    renderDataDisplay();
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearDisplay = document.getElementById('month-year');
    const weekNumbersDisplay = document.getElementById('week-numbers');
    if (!calendarGrid || !monthYearDisplay || !weekNumbersDisplay) return;

    calendarGrid.innerHTML = '';
    weekNumbersDisplay.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    monthYearDisplay.textContent = new Intl.DateTimeFormat('da-DK', { year: 'numeric', month: 'long' }).format(currentDate);

    const firstDayOfMonth = new Date(year, month, 1);
    let startDay = firstDayOfMonth.getDay();
    if (startDay === 0) startDay = 7;

    let calendarDays = [];
    for (let i = startDay - 1; i > 0; i--) calendarDays.push({ date: new Date(year, month, 1 - i), isOtherMonth: true });
    for (let i = 1; i <= new Date(year, month + 1, 0).getDate(); i++) calendarDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
    while (calendarDays.length % 7 !== 0) calendarDays.push({ date: new Date(year, month, new Date(year, month + 1, 0).getDate() + (calendarDays.length - new Date(year, month + 1, 0).getDate() + 1)), isOtherMonth: true });

    let currentWeek = -1;
    calendarDays.forEach((dayObj, index) => {
        const dayContainer = document.createElement('div');
        dayContainer.className = 'calendar-day-container';
        const dayEl = document.createElement('div');
        dayEl.className = 'flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold';
        const week = getWeekNumber(dayObj.date);
        if (index % 7 === 0 && week !== currentWeek) {
            weekNumbersDisplay.innerHTML += `<div class="h-8 flex items-center justify-center">${week}</div>`;
            currentWeek = week;
        }
        if (dayObj.isOtherMonth) {
            dayEl.classList.add('text-gray-400');
        } else {
            dayEl.classList.add('text-gray-700', 'cursor-pointer', 'hover:bg-blue-100');
        }
        if (dayObj.date.toDateString() === new Date().toDateString()) dayEl.classList.add('bg-blue-600', 'text-white');
        if (dayObj.date.toDateString() === selectedDate.toDateString()) dayEl.classList.add('ring-2', 'ring-blue-500');
        dayEl.textContent = dayObj.date.getDate();
        dayContainer.appendChild(dayEl);

        // --- NY, FORBEDRET LOGIK TIL INDIKATOR-PRIKKER ---
        const dateKey = formatDateKey(dayObj.date);
        const savedLog = allLogs.find(log => log.date === dateKey);

        if (savedLog) {
            const indicator = document.createElement('div');
            // Tjek om det er en Strava-aktivitet
            if (savedLog.stravaActivityId) {
                indicator.className = 'log-indicator strava'; // Særlig klasse til Strava
            } else {
                indicator.className = 'log-indicator'; // Almindelig klasse for manuelle logs
            }
            dayContainer.appendChild(indicator);
        }
        // --------------------------------------------------

        dayEl.addEventListener('click', () => {
            selectedDate = dayObj.date;
            currentDate = new Date(selectedDate);
            renderAll();
        });
        calendarGrid.appendChild(dayContainer);
    });
}

function renderWeeklyView() {
    const weeklyViewGrid = document.getElementById('weekly-view-grid');
    if (!weeklyViewGrid) return;
    weeklyViewGrid.innerHTML = '';
    const startOfWeek = getStartOfWeek(selectedDate);

    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dateKey = formatDateKey(day);

        const dayCard = document.createElement('div');
        dayCard.className = 'bg-white rounded-lg p-3 shadow flex flex-col min-h-[150px] cursor-pointer';
        if (day.toDateString() === selectedDate.toDateString()) dayCard.classList.add('ring-2', 'ring-blue-500');

        // Trin 1: Opret overskriften med ugedag og dato
        dayCard.innerHTML = `<div class="flex justify-between items-center text-sm font-semibold">
                                <span class="text-gray-500">${new Intl.DateTimeFormat('da-DK', { weekday: 'short' }).format(day)}</span>
                                <span class="text-gray-800">${day.getDate()}</span>
                             </div>`;

        // Trin 2: Find og vis planen for dagen
        const activePlan = getActivePlan(); // Hent den indlæste plan
        const plannedDay = activePlan.find(p => p.date === dateKey);
        
        const planTextElement = document.createElement('p');
        planTextElement.className = 'text-xs text-blue-600 mt-2 font-semibold flex-grow'; // flex-grow er vigtig!
        if (plannedDay && plannedDay.plan) {
            planTextElement.textContent = plannedDay.plan;
        } else {
            planTextElement.textContent = ''; // Tom tekst, hvis der ikke er en plan
        }
        dayCard.appendChild(planTextElement);


        // Trin 3: Eksisterende logik for de farvede prikker
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'flex items-center gap-1.5 mt-auto pt-2';
        const savedLog = allLogs.find(log => log.date === dateKey);
        let hasMorningData = false, hasTrainingData = false;

        if (savedLog) {
            const morningFields = ['hrv', 'rhr', 'sleep_quality'];
            const trainingFields = ['pte', 'vo2max', 'avg_watt', 'avg_hr', 'distance', 'duration', 'elevation'];
            hasMorningData = morningFields.some(field => savedLog[field] != null);
            hasTrainingData = trainingFields.some(field => savedLog[field] != null);
        }
        
        dotsContainer.innerHTML = `<div class="w-2.5 h-2.5 rounded-full" title="Morgen status" style="background-color: ${hasMorningData ? '#8b5cf6' : '#e5e7eb'}"></div>
                                 <div class="w-2.5 h-2.5 rounded-full" title="Træningsdata" style="background-color: ${hasTrainingData ? '#22c55e' : '#e5e7eb'}"></div>`;
        dayCard.appendChild(dotsContainer);
        
        dayCard.addEventListener('click', () => { selectedDate = day; renderAll(); });
        weeklyViewGrid.appendChild(dayCard);
    }
}

function renderDataDisplay() {
    const dataContent = document.getElementById('tab-content-data');
    const stravaActionsContainer = document.getElementById('strava-actions-container');
    if (!dataContent || !stravaActionsContainer) return;

    const dateKey = formatDateKey(selectedDate);
    const savedData = allLogs.find(log => log.date === dateKey) || {};

    let formHTML = `<p class="font-semibold mb-4 text-gray-700">Viser data for: ${selectedDate.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}</p>`;
    const inputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500";
    const labelClasses = "block text-sm font-medium text-gray-700";
    
    // Flyt dataFields herud, så vi kan genbruge den
    const dataFields = {
        morning: [{ id: 'hrv', label: 'HRV' }, { id: 'rhr', label: 'Hvilepuls' }, { id: 'sleep_quality', label: 'Søvn (1-5)' }],
        training: [{ id: 'pte', label: 'PTE' }, { id: 'vo2max', label: 'VO2max' }, { id: 'avg_watt', label: 'Gns. Watt' }, { id: 'avg_hr', label: 'Gns. Puls' }, { id: 'distance', label: 'Distance (km)' }, { id: 'duration', label: 'Tid (min)' }, { id: 'elevation', label: 'Højdemeter' }],
        general: [{ id: 'notes', label: 'Noter', type: 'textarea' }]
    };

    // Funktion til at bygge en sektion af formularen
    const buildSection = (title, fields) => {
        let sectionHTML = `<h4 class="font-bold text-lg mt-6 mb-2">${title}</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
        fields.forEach(f => {
            // Tjek om der er Strava-data for dette specifikke felt
            const stravaIndicator = (savedData.stravaActivityId && savedData[f.id] != null) 
                ? ' <span class="strava-dot" title="Data fra Strava"></span>' 
                : '';
            
            sectionHTML += `<div><label for="${f.id}-${dateKey}" class="${labelClasses}">${f.label}${stravaIndicator}</label><input type="number" step="0.1" id="${f.id}-${dateKey}" value="${savedData[f.id] || ''}" class="${inputClasses}"></div>`;
        });
        sectionHTML += `</div>`;
        return sectionHTML;
    };

    formHTML += buildSection('Morgen Status', dataFields.morning);
    formHTML += buildSection('Træningsdata', dataFields.training);

    formHTML += `<h4 class="font-bold text-lg mt-6 mb-2">Generelt</h4>`;
    formHTML += `<div><label for="notes-${dateKey}" class="${labelClasses}">Noter</label><textarea id="notes-${dateKey}" rows="4" class="${inputClasses}">${savedData.notes || ''}</textarea></div>`;

    dataContent.innerHTML = formHTML;
    dataContent.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', () => saveDataForDay(selectedDate));
    });

    // Håndter "Se på Strava"-linket (vi fjerner detalje-knappen for nu)
    stravaActionsContainer.innerHTML = '';
    if (savedData.stravaActivityId) {
        stravaActionsContainer.innerHTML = `<a href="https://www.strava.com/activities/${savedData.stravaActivityId}" target="_blank" class="text-sm font-semibold text-orange-600 hover:text-orange-800 transition-colors">Se aktivitet på Strava</a>`;
    }
}

async function saveDataForDay(date) {
    const dateKey = formatDateKey(date);
    const dataPayload = { date: dateKey };
    document.querySelectorAll('#tab-content-data input, #tab-content-data textarea').forEach(input => {
        const fieldName = input.id.split('-')[0];
        if (input.type === 'number') {
            dataPayload[fieldName] = input.value ? parseFloat(input.value) : null;
        } else {
            dataPayload[fieldName] = input.value || null;
        }
    });
    try {
        const response = await fetch('/api/save-daily-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataPayload)
        });
        if (!response.ok) throw new Error('Serverfejl ved gem');
        const existingLogIndex = allLogs.findIndex(log => log.date === dateKey);
        if (existingLogIndex > -1) {
            allLogs[existingLogIndex] = { ...allLogs[existingLogIndex], ...dataPayload };
        } else {
            allLogs.push(dataPayload);
        }
    } catch (error) {
        console.error('Fejl ved at gemme data:', error);
    }
}

export async function initializeCalendar() {
    try {
        const response = await fetch('/api/get-logs');
        if (!response.ok) throw new Error('Kunne ikke hente data');
        const rawLogs = await response.json();
        const logsByDate = {};
        rawLogs.forEach(log => {
            if (!logsByDate[log.date] || new Date(log.created_at) > new Date(logsByDate[log.date].created_at)) {
                logsByDate[log.date] = log;
            }
        });
        allLogs = Object.values(logsByDate);
        console.log(`Hentede ${rawLogs.length} rå logs og efterlod ${allLogs.length} unikke, seneste logs.`);
    } catch (error) {
        console.error("Fejl ved hentning af logs:", error);
        allLogs = [];
    }
    
    activePlan = getActivePlan();
    stravaActivities = JSON.parse(localStorage.getItem('strava_activities')) || [];
    
    renderAll();

    const addSafeListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element && !element.dataset.listenerAttached) {
            element.dataset.listenerAttached = 'true';
            element.addEventListener(event, handler);
        }
    };

    addSafeListener('prev-month', 'click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderAll(); });
    addSafeListener('next-month', 'click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderAll(); });
    addSafeListener('export-calendar', 'click', () => window.open('/api/export-logs', '_blank'));
    addSafeListener('load-calendar', 'click', () => document.getElementById('calendar-file-input').click());
    addSafeListener('calendar-file-input', 'change', (event) => { /* ... uændret ... */ });

    addSafeListener('syncStravaBtn', 'click', async () => {
        const syncBtn = document.getElementById('syncStravaBtn');
        const originalText = 'Synkroniser med Strava';
        syncBtn.textContent = 'Henter aktivitetsliste...';
        syncBtn.disabled = true;
        try {
            const activities = await fetchActivities();
            localStorage.setItem('strava_activities', JSON.stringify(activities));
            stravaActivities = activities;
            const importedActivityIds = new Set(allLogs.map(log => log.stravaActivityId).filter(id => id));
            const newActivities = activities.filter(act => !importedActivityIds.has(act.id.toString()));

            if (newActivities.length === 0) {
                syncBtn.textContent = 'Alt er synkroniseret!';
                setTimeout(() => { syncBtn.textContent = originalText; syncBtn.disabled = false; }, 2000);
                return;
            }

            syncBtn.textContent = `Fandt ${newActivities.length} nye. Forbereder...`;
            const logsToCreate = newActivities.map(activity => {
                console.log("Rå aktivitet-data modtaget fra Strava:", activity);

                const dateKey = activity.start_date_local.split('T')[0];
                return {
                    date: dateKey,
                    distance: activity.distance ? (activity.distance / 1000).toFixed(2) : null,
                    duration: activity.moving_time ? Math.round(activity.moving_time / 60) : null,
                    elevation: activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : null,
                    avg_watt: activity.average_watts ? Math.round(activity.average_watts) : null,
                    avg_hr: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
                    stravaActivityId: activity.id.toString()
                };
            });

            syncBtn.textContent = 'Gemmer i database...';
            const response = await fetch('/api/bulk-save-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logsToCreate),
            });
            if (!response.ok) throw new Error("Kunne ikke gemme de synkroniserede data til databasen.");

            alert(`${logsToCreate.length} nye aktiviteter blev synkroniseret! Siden genindlæses nu.`);
            location.reload();
        } catch (error) {
            console.error("Fejl under Strava-synkronisering:", error);
            alert(`Der opstod en fejl under synkronisering: ${error.message}`);
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
        }
    });
}