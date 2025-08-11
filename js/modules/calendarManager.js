// calendarManager.js - FULDT RETTET VERSION (11. AUGUST 2025)

import { getActivePlan } from './planManager.js';
import { fetchActivities, fetchActivityDetails } from './stravaManager.js';

// --- GLOBALE VARIABLER ---
let currentDate = new Date();
let selectedDate = new Date();
let activePlan = [];
let allLogs = []; // Her gemmes ALLE logs fra databasen efter de er hentet
let stravaActivities = []; // Bruges som en midlertidig cache

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

// --- RENDERING AF UI (LÆSER NU KUN FRA allLogs) ---
function renderAll() {
    renderCalendar();
    renderWeeklyView();
    renderDataDisplay();
}

function renderCalendar() {
    // ... (Denne funktion er primært til at tegne selve kalender-grid'et og er ok)
    // Vi retter kun den del, der viser, om der er en log
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
        
        // RETTET: Kigger nu i allLogs-arrayet for at vise en prik
        if (allLogs.some(log => log.date === formatDateKey(dayObj.date))) {
            const indicator = document.createElement('div');
            indicator.className = 'log-indicator';
            dayContainer.appendChild(indicator);
        }

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
        dayCard.innerHTML = `<div class="flex justify-between items-center text-sm font-semibold">
                                <span class="text-gray-500">${new Intl.DateTimeFormat('da-DK', { weekday: 'short' }).format(day)}</span>
                                <span class="text-gray-800">${day.getDate()}</span>
                             </div>`;

        // RETTET: Kigger nu i allLogs for at finde data
        const savedLog = allLogs.find(log => log.date === dateKey);
        let hasMorningData = false, hasTrainingData = false;

        if (savedLog) {
            // Definer hvilke felter der tæller som "morgen" og "træning"
            const morningFields = ['hrv', 'rhr', 'sleep_quality'];
            const trainingFields = ['pte', 'vo2max', 'avg_watt', 'avg_hr'];
            hasMorningData = morningFields.some(field => savedLog[field] != null);
            hasTrainingData = trainingFields.some(field => savedLog[field] != null);
        }

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'flex items-center gap-1.5 mt-auto pt-2';
        dotsContainer.innerHTML = `<div class="w-2.5 h-2.5 rounded-full" title="Morgen status" style="background-color: ${hasMorningData ? '#8b5cf6' : '#e5e7eb'}"></div>
                                 <div class="w-2.5 h-2.5 rounded-full" title="Træningsdata" style="background-color: ${hasTrainingData ? '#22c55e' : '#e5e7eb'}"></div>`;
        dayCard.appendChild(dotsContainer);
        dayCard.addEventListener('click', () => { selectedDate = day; renderAll(); });
        weeklyViewGrid.appendChild(dayCard);
    }
}

function renderDataDisplay() {
    const dataContent = document.getElementById('tab-content-data');
    if (!dataContent) return;

    const dateKey = formatDateKey(selectedDate);
    // RETTET: Kigger nu KUN i allLogs
    const savedData = allLogs.find(log => log.date === dateKey) || {};

    // Byg HTML-formularen dynamisk... (denne del er lang, men logikken er den samme)
    // Sørger for at `value` hentes fra `savedData` objektet.
    let formHTML = `<p class="font-semibold mb-4 text-gray-700">Viser data for: ${selectedDate.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}</p>`;
    const inputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500";
    const labelClasses = "block text-sm font-medium text-gray-700";

    const dataFields = {
        morning: [{ id: 'hrv', label: 'HRV' }, { id: 'rhr', label: 'Hvilepuls' }, { id: 'sleep_quality', label: 'Søvn (1-5)' }],
        training: [{ id: 'pte', label: 'PTE' }, { id: 'vo2max', label: 'VO2max' }, { id: 'avg_watt', label: 'Gns. Watt' }, { id: 'avg_hr', label: 'Gns. Puls' }],
        general: [{ id: 'notes', label: 'Noter', type: 'textarea' }]
    };

    formHTML += `<h4 class="font-bold text-lg mt-4 mb-2">Morgen Status</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
    dataFields.morning.forEach(f => {
        formHTML += `<div><label for="${f.id}-${dateKey}" class="${labelClasses}">${f.label}</label><input type="number" id="${f.id}-${dateKey}" value="${savedData[f.id] || ''}" class="${inputClasses}"></div>`;
    });
    formHTML += `</div>`;

    formHTML += `<h4 class="font-bold text-lg mt-6 mb-2">Træningsdata</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
    dataFields.training.forEach(f => {
        formHTML += `<div><label for="${f.id}-${dateKey}" class="${labelClasses}">${f.label}</label><input type="number" step="0.1" id="${f.id}-${dateKey}" value="${savedData[f.id] || ''}" class="${inputClasses}"></div>`;
    });
    formHTML += `</div>`;

    formHTML += `<h4 class="font-bold text-lg mt-6 mb-2">Generelt</h4>`;
    formHTML += `<div><label for="notes-${dateKey}" class="${labelClasses}">${dataFields.general[0].label}</label><textarea id="notes-${dateKey}" rows="4" class="${inputClasses}">${savedData.notes || ''}</textarea></div>`;

    dataContent.innerHTML = formHTML;

    // Tilføj listeners til de nye input-felter
    dataContent.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', () => saveDataForDay(selectedDate));
    });
}

// --- DATAHÅNDTERING (GEMMER NU KUN TIL DATABASEN) ---
async function saveDataForDay(date) {
    const dateKey = formatDateKey(date);
    const dataPayload = { date: dateKey };

    // Saml data fra alle felter
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
        
        // Opdater vores lokale 'allLogs' array for at afspejle ændringen med det samme
        const existingLogIndex = allLogs.findIndex(log => log.date === dateKey);
        if (existingLogIndex > -1) {
            allLogs[existingLogIndex] = { ...allLogs[existingLogIndex], ...dataPayload };
        } else {
            allLogs.push(dataPayload);
        }
        // Vi kan evt. gen-tegne weekly view for at opdatere prikkerne
        // renderWeeklyView();

    } catch (error) {
        console.error('Fejl ved at gemme data:', error);
    }
}

// --- INITIALISERING OG EVENT LISTENERS ---
export async function initializeCalendar() {
    try {
        const response = await fetch('/api/get-logs');
        if (!response.ok) throw new Error('Kunne ikke hente data');
        allLogs = await response.json();
        console.log(`Hentede ${allLogs.length} logs fra databasen.`);
    } catch (error) {
        console.error("Fejl ved hentning af logs:", error);
        allLogs = [];
    }
    
    // RETTET: Henter fra localStorage, som er en cache
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

    // Opsæt alle knap-listeners
    addSafeListener('prev-month', 'click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderAll(); });
    addSafeListener('next-month', 'click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderAll(); });
    addSafeListener('export-calendar', 'click', () => window.open('/api/export-logs', '_blank'));
    addSafeListener('load-calendar', 'click', () => document.getElementById('calendar-file-input').click());

    addSafeListener('calendar-file-input', 'change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedLogs = JSON.parse(e.target.result);
                const response = await fetch('/api/bulk-save-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(importedLogs),
                });
                if (!response.ok) throw new Error('Serveren kunne ikke importere dataene.');
                alert(`${importedLogs.length} logs blev importeret! Siden genindlæses.`);
                location.reload();
            } catch (error) {
                alert(`Fejl ved import: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });

    // GENOPBYGGET STRAVA SYNC
    addSafeListener('syncStravaBtn', 'click', async () => {
    const syncBtn = document.getElementById('syncStravaBtn');
    const originalText = syncBtn.innerHTML;
    syncBtn.textContent = 'Henter liste...';
    syncBtn.disabled = true;

    try {
        // Trin 1: Hent de seneste aktiviteter fra Strava
        const activities = await fetchActivities();
        // Opdater vores lokale cache for en sikkerheds skyld
        localStorage.setItem('strava_activities', JSON.stringify(activities));
        stravaActivities = activities;

        // Trin 2: Find ud af, hvilke aktiviteter vi allerede har importeret
        // Vi kigger KUN i 'allLogs' fra databasen.
        const importedActivityIds = new Set(allLogs.map(log => log.stravaActivityId).filter(id => id));
        const newActivities = activities.filter(act => !importedActivityIds.has(act.id.toString()));

        // Trin 3: Håndter situationen, hvis der ikke er noget nyt
        if (newActivities.length === 0) {
            syncBtn.textContent = 'Alt er synkroniseret!';
            renderAll(); // Gen-tegn UI for en sikkerheds skyld
            setTimeout(() => { syncBtn.innerHTML = originalText; syncBtn.disabled = false; }, 2000);
            return;
        }

        // Trin 4: Byg en liste af nye logs, der skal gemmes
        let logsToCreate = [];
        for (let i = 0; i < newActivities.length; i++) {
            const activity = newActivities[i];
            syncBtn.textContent = `Henter detaljer ${i + 1}/${newActivities.length}...`;
            
            // Vi henter ikke fulde detaljer her for at gøre synkroniseringen hurtig.
            // Det kan brugeren gøre manuelt senere, hvis nødvendigt.
            const dateKey = activity.start_date_local.split('T')[0];
            
            const newLog = {
                date: dateKey,
                distance: activity.distance ? (activity.distance / 1000).toFixed(2) : null,
                duration: activity.moving_time ? Math.round(activity.moving_time / 60) : null,
                elevation: activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : null,
                stravaActivityId: activity.id.toString() // Sørg for at gemme ID som tekst
            };
            logsToCreate.push(newLog);
        }

        // Trin 5: Gem alle de nye logs i databasen med ét enkelt, effektivt kald
        syncBtn.textContent = 'Gemmer i database...';
        const response = await fetch('/api/bulk-save-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logsToCreate),
        });
        if (!response.ok) {
            throw new Error("Kunne ikke gemme de synkroniserede data til databasen.");
        }

        alert(`${logsToCreate.length} nye aktiviteter blev synkroniseret! Siden genindlæses nu.`);
        location.reload(); // Genindlæs for at vise de helt nye data

    } catch (error) {
        console.error("Fejl under Strava-synkronisering:", error);
        alert(`Der opstod en fejl under synkronisering: ${error.message}`);
        syncBtn.innerHTML = originalText;
        syncBtn.disabled = false;
    }
});