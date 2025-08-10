import { getActivePlan } from './planManager.js';
import { fetchActivities, fetchActivityDetails } from './stravaManager.js';

const dataFields = {
    morning: [{ id: 'hrv', label: 'HRV', type: 'number' }, { id: 'rhr', label: 'Hvilepuls', type: 'number' }, { id: 'sleepQuality', label: 'Søvnkvalitet (1-5)', type: 'number' }, { id: 'soreness', label: 'Muskelømhed (1-5)', type: 'number' }],
    training: [{ id: 'pte', label: 'PTE', type: 'number', step: '0.1' }, { id: 'vo2max', label: 'VO2max', type: 'number', step: '0.1' }, { id: 'avgWatt', label: 'Gns. Watt', type: 'number' }, { id: 'avgHr', label: 'Gns. Puls', type: 'number' }, { id: 'distance', label: 'Distance (km)', type: 'number', step: '0.1' }, { id: 'duration', label: 'Varighed (min)', type: 'number' }, { id: 'elevation', label: 'Højdemeter', type: 'number' }],
    general: [{ id: 'notes', label: 'Noter', type: 'textarea' }, { id: 'isBenchmark', label: 'Marker som Effektivitets-Test', type: 'checkbox' }]
};

let currentDate = new Date();
let selectedDate = new Date();
let activePlan = [];
let stravaActivities = [];

// --- UTILITY FUNCTIONS ---
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getUserProfileData() {
    // Henter de nødvendige data fra Løberdata-siden i localStorage
    return {
        hrZone1: localStorage.getItem('hrZone1'),
        hrZone2: localStorage.getItem('hrZone2'),
        hrZone3: localStorage.getItem('hrZone3'),
        hrZone4: localStorage.getItem('hrZone4'),
        hrZone5: localStorage.getItem('hrZone5'),
        maxHR: parseInt(localStorage.getItem('maxHR'), 10)
    };
}

// --- RENDER FUNCTIONS ---
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
            const plannedDay = activePlan.find(p => p.date === formatDateKey(dayObj.date));
            if (plannedDay && !plannedDay.isRestDay) dayEl.classList.add('bg-blue-50');
        }
        if (dayObj.date.toDateString() === new Date().toDateString()) dayEl.classList.add('bg-blue-600', 'text-white');
        if (dayObj.date.toDateString() === selectedDate.toDateString()) dayEl.classList.add('ring-2', 'ring-blue-500');
        dayEl.textContent = dayObj.date.getDate();
        dayContainer.appendChild(dayEl);
        
        const activityForDay = stravaActivities.find(act => act.start_date_local.startsWith(formatDateKey(dayObj.date)));
        if (activityForDay) {
            const stravaIcon = document.createElement('div');
            stravaIcon.className = 'strava-indicator';
            stravaIcon.title = `Strava: ${activityForDay.name}`;
            dayContainer.appendChild(stravaIcon);
        }
        // RETTELSE: Fjernet duplikeret linje
        if (localStorage.getItem(`log-${formatDateKey(dayObj.date)}`)) {
            dayContainer.innerHTML += '<div class="log-indicator"></div>';
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
        const dayHeader = document.createElement('div');
        dayHeader.className = 'flex justify-between items-center text-sm font-semibold';
        const dayName = document.createElement('span');
        dayName.textContent = new Intl.DateTimeFormat('da-DK', { weekday: 'short' }).format(day);
        dayName.className = 'text-gray-500';
        const dayNumber = document.createElement('span');
        dayNumber.textContent = day.getDate();
        dayNumber.className = 'text-gray-800';
        if (new Date().toDateString() === day.toDateString()) dayNumber.className = 'bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center';
        dayHeader.appendChild(dayName);
        dayHeader.appendChild(dayNumber);
        dayCard.appendChild(dayHeader);
        const plannedDay = activePlan.find(p => p.date === dateKey);
        if (plannedDay) {
            const planText = document.createElement('p');
            planText.className = 'text-xs text-blue-600 mt-2 font-semibold flex-grow';
            planText.textContent = `Planlagt: ${plannedDay.plan}`;
            dayCard.appendChild(planText);
        }
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'flex items-center gap-1.5 mt-auto pt-2';
        const savedLogJson = localStorage.getItem(`log-${dateKey}`);
        let hasMorningData = false, hasTrainingData = false;
        if (savedLogJson) {
            const savedData = JSON.parse(savedLogJson);
            hasMorningData = dataFields.morning.some(field => savedData[field.id] && String(savedData[field.id]).trim() !== '');
            hasTrainingData = dataFields.training.some(field => savedData[field.id] && String(savedData[field.id]).trim() !== '');
        }
        const morningDot = document.createElement('div');
        morningDot.className = 'w-2.5 h-2.5 rounded-full';
        morningDot.title = 'Morgen status';
        morningDot.style.backgroundColor = hasMorningData ? '#8b5cf6' : '#e5e7eb';
        const trainingDot = document.createElement('div');
        trainingDot.className = 'w-2.5 h-2.5 rounded-full';
        trainingDot.title = 'Træningsdata';
        trainingDot.style.backgroundColor = hasTrainingData ? '#22c55e' : '#e5e7eb';
        dotsContainer.appendChild(morningDot);
        dotsContainer.appendChild(trainingDot);
        dayCard.appendChild(dotsContainer);
        dayCard.addEventListener('click', () => { selectedDate = day; renderAll(); });
        weeklyViewGrid.appendChild(dayCard);
    }
}

function renderDataDisplay() {
    const dataContent = document.getElementById('tab-content-data');
    if (!dataContent) return;

    const dateKey = formatDateKey(selectedDate);
    const savedData = JSON.parse(localStorage.getItem(`log-${dateKey}`)) || {};
    const plannedDay = activePlan.find(p => p.date === dateKey);
    const activityForDay = stravaActivities.find(act => act.start_date_local.startsWith(dateKey));

    let formHTML = `<p class="font-semibold mb-4 text-gray-700">Viser data for: ${selectedDate.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}</p>`;
    if (plannedDay) formHTML += `<div class="p-3 bg-blue-50 rounded-md mb-4"><p class="text-sm font-semibold text-blue-800">Planlagt: <span class="font-normal">${plannedDay.plan}</span></p></div>`;
    
    const inputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500";
    const labelClasses = "block text-sm font-medium text-gray-700";

    formHTML += `<h4 class="font-bold text-lg mt-4 mb-2">Morgen Status</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
    dataFields.morning.forEach(f => {
        // RETTELSE: Tilføjet for="${f.id}-${dateKey}" til label
        formHTML += `<div><label for="${f.id}-${dateKey}" class="${labelClasses}">${f.label}</label><input type="${f.type}" id="${f.id}-${dateKey}" value="${savedData[f.id] || ''}" class="${inputClasses}"></div>`;
    });
    formHTML += `</div>`;

    formHTML += `<h4 class="font-bold text-lg mt-6 mb-2">Træningsdata</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;
    dataFields.training.forEach(f => {
        // RETTELSE: Tilføjet for="${f.id}-${dateKey}" til label
        formHTML += `<div><label for="${f.id}-${dateKey}" class="${labelClasses}">${f.label}</label><input type="${f.type}" id="${f.id}-${dateKey}" value="${savedData[f.id] || ''}" ${f.step ? `step="${f.step}"` : ''} class="${inputClasses}"></div>`;
    });
    formHTML += `</div>`;

    formHTML += `<h4 class="font-bold text-lg mt-6 mb-2">Generelt</h4>`;
    dataFields.general.forEach(f => {
        if (f.type === 'textarea') {
            // RETTELSE: Tilføjet for="${f.id}-${dateKey}" til label
            formHTML += `<div><label for="${f.id}-${dateKey}" class="${labelClasses}">${f.label}</label><textarea id="${f.id}-${dateKey}" rows="4" class="${inputClasses}">${savedData[f.id] || ''}</textarea></div>`;
        }
        if (f.type === 'checkbox') {
            const isChecked = savedData[f.id] === 'true' ? 'checked' : '';
            formHTML += `<div class="checkbox-group"><input type="checkbox" id="${f.id}-${dateKey}" ${isChecked} class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"><label for="${f.id}-${dateKey}" class="ml-2 block text-sm text-gray-900">${f.label}</label></div>`;
        }
    });

    dataContent.innerHTML = formHTML;

    // 3. Tilføj listeners til input-felterne
    dataContent.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', () => saveDataForDay(selectedDate));
        input.addEventListener('change', () => renderAll());
    });

    // --- LOGIK FOR KNAPPER, DER LIGGER UDEN FOR 'dataContent' ---

    // Håndter manuel import-knap
    const importStravaBtn = document.getElementById('import-strava-btn');
    if (importStravaBtn) {
        const newBtn = importStravaBtn.cloneNode(true);
        importStravaBtn.parentNode.replaceChild(newBtn, importStravaBtn);
        newBtn.style.display = 'none';

        if (activityForDay && !savedData.stravaData) {
            newBtn.style.display = 'flex';
            newBtn.addEventListener('click', async () => {
            newBtn.textContent = 'Importerer...';
            newBtn.disabled = true;
            try {
                const stravaFullData = await fetchActivityDetails(activityForDay.id);
                const details = stravaFullData.summary;

                // --- START PÅ NY KODE TIL PTE BEREGNING ---
                const userProfile = getUserProfileData();
                const estimatedPte = estimatePte(stravaFullData, userProfile);
                // --- SLUT PÅ NY KODE ---

                // Map Strava-data (og vores nye PTE) til dine input-felter
                if (estimatedPte) {
                    document.getElementById(`pte-${dateKey}`).value = estimatedPte;
                }
                if (details.distance) document.getElementById(`distance-${dateKey}`).value = (details.distance / 1000).toFixed(2);
                if (details.moving_time) document.getElementById(`duration-${dateKey}`).value = Math.round(details.moving_time / 60);
                if (details.total_elevation_gain) document.getElementById(`elevation-${dateKey}`).value = Math.round(details.total_elevation_gain);
                if (details.average_heartrate) document.getElementById(`avgHr-${dateKey}`).value = Math.round(details.average_heartrate);
                if (details.average_watts) document.getElementById(`avgWatt-${dateKey}`).value = Math.round(details.average_watts);
                
                const currentLog = JSON.parse(localStorage.getItem(`log-${dateKey}`)) || {};
                currentLog.stravaActivityId = activityForDay.id;
                currentLog.stravaImportedAt = new Date().toISOString();
                currentLog.stravaData = stravaFullData;
                localStorage.setItem(`log-${dateKey}`, JSON.stringify(currentLog));
                
                saveDataForDay(selectedDate);
                renderAll();
                newBtn.textContent = 'Data Importeret!';

            } catch (error) {
                console.error("Fejl ved import af Strava-detaljer:", error);
                alert("Kunne ikke importere data.");
                newBtn.innerHTML = `Fejl - Prøv igen`;
            }
        });
        }
    }
    
    // ### GENINDSAT OG RETTET LOGIK FOR "MERE"-KNAPPEN ###
    const toggleBtn = document.getElementById('toggle-strava-details-btn');
    const detailsContainer = document.getElementById('strava-details-container');

    if (toggleBtn && detailsContainer) {
        // Nulstil altid tilstanden, når en ny dag vælges
        toggleBtn.style.display = 'none';
        detailsContainer.style.display = 'none';
        toggleBtn.textContent = 'Vis flere Strava-detaljer...';

        // Tjek om der er gemt rige Strava-data for den valgte dag
        if (savedData && savedData.stravaData) {
            toggleBtn.style.display = 'block';

            const summary = savedData.stravaData.summary;
            let detailsHTML = '<ul>';
            if (summary.name) detailsHTML += `<li><strong>Aktivitet:</strong> ${summary.name}</li>`;
            if (summary.max_heartrate) detailsHTML += `<li><strong>Max Puls:</strong> ${summary.max_heartrate} bpm</li>`;
            if (summary.average_cadence) detailsHTML += `<li><strong>Gns. Kadence:</strong> ${(summary.average_cadence * 2).toFixed(0)} spm</li>`;
            if (summary.distance && summary.elapsed_time) {
                const gapPace = (summary.elapsed_time / 60) / (summary.distance / 1000);
                const gapMinutes = Math.floor(gapPace);
                const gapSeconds = Math.round((gapPace - gapMinutes) * 60);
                detailsHTML += `<li><strong>Grade Adjusted Pace (GAP):</strong> ${gapMinutes}:${String(gapSeconds).padStart(2, '0')} min/km</li>`;
            }
            detailsHTML += '</ul>';
            detailsContainer.innerHTML = detailsHTML;

            const newToggleBtn = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
            newToggleBtn.addEventListener('click', () => {
                const isHidden = detailsContainer.style.display === 'none';
                detailsContainer.style.display = isHidden ? 'block' : 'none';
                newToggleBtn.textContent = isHidden ? 'Skjul Strava-detaljer' : 'Vis flere Strava-detaljer...';
            });
        }
    }
}

function saveDataForDay(date) {
    const dateKey = formatDateKey(date);
    const dataToSave = JSON.parse(localStorage.getItem(`log-${dateKey}`)) || {};
    let hasData = false;
    Object.values(dataFields).flat().forEach(field => {
        const inputElement = document.getElementById(`${field.id}-${dateKey}`);
        if (inputElement) {
            const value = field.type === 'checkbox' ? (inputElement.checked ? 'true' : 'false') : inputElement.value;
            if (value && value.trim() !== '' && (field.type !== 'checkbox' || value === 'true')) hasData = true;
            dataToSave[field.id] = value;
        }
    });
    if (hasData || dataToSave.stravaData) {
        localStorage.setItem(`log-${dateKey}`, JSON.stringify(dataToSave));
    } else {
        localStorage.removeItem(`log-${dateKey}`);
    }
}

function estimatePte(stravaData, userProfile) {
    if (!stravaData.streams || !stravaData.streams.heartrate || !userProfile.maxHR) {
        return null; // Kan ikke beregne uden puls-data og max-puls
    }

    const zones = [
        userProfile.hrZone1?.split('-').map(Number) || [0, 0.6 * userProfile.maxHR],
        userProfile.hrZone2?.split('-').map(Number) || [0.6 * userProfile.maxHR, 0.7 * userProfile.maxHR],
        userProfile.hrZone3?.split('-').map(Number) || [0.7 * userProfile.maxHR, 0.8 * userProfile.maxHR],
        userProfile.hrZone4?.split('-').map(Number) || [0.8 * userProfile.maxHR, 0.9 * userProfile.maxHR],
        userProfile.hrZone5?.split('-').map(Number) || [0.9 * userProfile.maxHR, userProfile.maxHR]
    ];

    const timeInZone = [0, 0, 0, 0, 0]; // Sekunder i Z1 til Z5
    const hrStream = stravaData.streams.heartrate.data;
    const timeStream = stravaData.streams.time.data;

    for (let i = 1; i < hrStream.length; i++) {
        const duration = timeStream[i] - timeStream[i-1];
        const avgHr = (hrStream[i] + hrStream[i-1]) / 2;

        for (let z = 0; z < zones.length; z++) {
            if (avgHr >= zones[z][0] && avgHr <= zones[z][1]) {
                timeInZone[z] += duration;
                break;
            }
        }
    }

    // Vægtet formel til at estimere EPOC, som er basis for PTE
    // Point pr. minut i hver zone
    const epocContribution = 
        (timeInZone[0] / 60) * 0.5 + // Zone 1
        (timeInZone[1] / 60) * 1.2 + // Zone 2
        (timeInZone[2] / 60) * 2.0 + // Zone 3
        (timeInZone[3] / 60) * 4.5 + // Zone 4
        (timeInZone[4] / 60) * 8.0;  // Zone 5

    // Skaler EPOC-estimatet til PTE-skalaen 1-5
    let pte = 1.0 + (epocContribution / 60); // Simpel skalering
    if (pte > 5.0) pte = 5.0;

    return pte.toFixed(1);
}

export function initializeCalendar() {
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
    
    // OPDATERET: Logik for intelligent synkronisering
    addSafeListener('syncStravaBtn', 'click', async () => {
        const syncBtn = document.getElementById('syncStravaBtn');
        const originalText = syncBtn.innerHTML;
        syncBtn.textContent = 'Henter liste...';
        syncBtn.disabled = true;

        try {
            const activities = await fetchActivities();
            stravaActivities = activities;
            localStorage.setItem('strava_activities', JSON.stringify(activities));

            let importedIds = new Set();
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('log-')) {
                    const logData = JSON.parse(localStorage.getItem(key));
                    if (logData.stravaActivityId) importedIds.add(logData.stravaActivityId);
                }
            }
            const newActivities = activities.filter(act => !importedIds.has(act.id));

            if (newActivities.length === 0) {
                syncBtn.textContent = 'Alt er synkroniseret!';
                setTimeout(() => { syncBtn.innerHTML = originalText; syncBtn.disabled = false; }, 2000);
                renderAll();
                return;
            }

            for (let i = 0; i < newActivities.length; i++) {
                const activity = newActivities[i];
                syncBtn.textContent = `Importerer ${i + 1} af ${newActivities.length}...`;
                const stravaFullData = await fetchActivityDetails(activity.id);
                const details = stravaFullData.summary;
                const dateKey = details.start_date_local.split('T')[0];
                const currentLog = JSON.parse(localStorage.getItem(`log-${dateKey}`)) || {};
                
                currentLog.distance = (details.distance / 1000).toFixed(2);
                currentLog.duration = Math.round(details.moving_time / 60);
                // ... (map flere felter efter behov) ...
                currentLog.stravaActivityId = activity.id;
                currentLog.stravaImportedAt = new Date().toISOString();
                currentLog.stravaData = stravaFullData;
                localStorage.setItem(`log-${dateKey}`, JSON.stringify(currentLog));
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            renderAll();
        } catch (error) {
            console.error("Fejl:", error); alert("Kunne ikke synkronisere.");
        } finally {
            syncBtn.innerHTML = originalText;
            syncBtn.disabled = false;
        }
    });

    addSafeListener('prev-month', 'click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderAll(); });
    addSafeListener('next-month', 'click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderAll(); });
}