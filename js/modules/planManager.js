let activePlan = [];
let currentWeekIndex = 0;
let weeks = [];
let planTimelineChart = null;

// --- UTILITY FUNCTIONS ---

function getStartOfWeekKey(d) {
    const date = new Date(d);
    const day = date.getDay(); // Søndag = 0, Mandag = 1, ...
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Juster til mandag
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
    // RETTELSE: Tjek om planText overhovedet eksisterer. Hvis ikke, returner 0.
    if (!planText) {
        return 0;
    }

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

    let baseTssPerHour = 50; // Default
    if (text.includes('langtur')) baseTssPerHour = 65; // Lidt højere
    if (text.includes('tempo') || text.includes('rpe 7-8')) baseTssPerHour = 90; // Markant højere
    if (text.includes('bakke') || text.includes('intervaller')) baseTssPerHour = 105; // Markant højere
    if (text.includes('let løb') || text.includes('rpe 3-4')) baseTssPerHour = 50; // Justeret
    if (text.includes('styrke')) baseTssPerHour = 35; // Uændret

    if (durationInMinutes > 0) {
        return Math.round((baseTssPerHour / 60) * durationInMinutes);
    }
    return baseTssPerHour;
}

// --- RENDER FUNCTIONS ---
function renderPlanPage() {
    if (!activePlan || activePlan.length === 0) {
        if (planTimelineChart) planTimelineChart.destroy();
        const ctx = document.getElementById('planTimelineChart')?.getContext('2d');
        if(ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        document.getElementById('weekly-bar-chart').innerHTML = '';
        document.getElementById('weekly-overview-title').textContent = 'Importer en plan for at starte';
        document.getElementById('plan-details-view').innerHTML = '<p class="text-center text-gray-500">Ingen plan er aktiv.</p>';
        return;
    }
    
    weeks = [...new Set(activePlan.map(d => getStartOfWeekKey(new Date(d.date))))];
    weeks.sort();
    
    currentWeekIndex = 0;

    renderPlanTimelineChart();
    renderWeek(currentWeekIndex);
}

// Tegning af progrationsgrafen
function renderPlanTimelineChart() {
    const ctx = document.getElementById('planTimelineChart')?.getContext('2d');
    if (!ctx) return;

    if (planTimelineChart) {
        planTimelineChart.destroy();
    }

    const CTL_CONST = 42;
    const ATL_CONST = 7;
    let ctl = 0, atl = 0;
    
    const ctlData = [];
    const atlData = []; // Gen-introduceret array til trætheds-data
    const tsbData = [];
    const raceGoals = [];

    activePlan.forEach((day) => {
        const tss = estimateTssFromPlan(day.plan);
        ctl = ctl + (tss - ctl) / CTL_CONST;
        atl = atl + (tss - atl) / ATL_CONST;
        
        ctlData.push({ x: day.date, y: ctl });
        atlData.push({ x: day.date, y: atl }); // Gemmer ATL-data for hver dag
        tsbData.push({ x: day.date, y: ctl - atl });

        const planText = day.plan.toLowerCase();
        if (planText.startsWith('a-mål') || planText.startsWith('b-mål') || planText.startsWith('c-mål')) {
            let borderColor = '#facc15';
            if (planText.startsWith('a-mål')) borderColor = '#e11d48';
            if (planText.startsWith('b-mål')) borderColor = '#f97316';

            raceGoals.push({
                date: day.date,
                label: day.plan.split(':')[0],
                borderColor: borderColor
            });
        }
    });

    const today = new Date().toISOString().split('T')[0];
    const annotations = raceGoals.reduce((acc, goal) => {
        acc[goal.label] = {
            type: 'line',
            xMin: goal.date,
            xMax: goal.date,
            borderColor: goal.borderColor,
            borderWidth: 2,
            label: { content: goal.label, display: true, position: 'start', font: { weight: 'bold' } }
        };
        return acc;
    }, {});

    annotations['todayLine'] = {
        type: 'line',
        xMin: today,
        xMax: today,
        borderColor: '#22c55e',
        borderWidth: 3,
        borderDash: [6, 6],
        label: {
            content: 'I dag', display: true, position: 'end', yAdjust: -15,
            font: { weight: 'bold' }, backgroundColor: 'rgba(34, 197, 94, 0.8)',
            color: 'white', borderRadius: 4, padding: 4
        }
    };

    planTimelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Fremtidig fitness',
                    data: ctlData,
                    borderColor: '#0284c7',
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.4
                },
                // GEN-INDSAT: Datasæt for Fremtidig Træthed (ATL)
                {
                    label: 'Fremtidig træthed',
                    data: atlData,
                    borderColor: '#e11d48', // Rød farve
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'Fremtidig form',
                    data: tsbData,
                    borderColor: '#16a34a',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { 
                    type: 'time', 
                    time: { unit: 'week', tooltipFormat: 'dd MMM yyyy', displayFormats: { week: "'Uge' w" } }, 
                    grid: { color: 'rgba(0, 0, 0, 0.1)'} 
                },
                y: { 
                    type: 'linear', 
                    display: true, 
                    position: 'left', 
                    title: { display: true, text: 'Score' }
                }
            },
            plugins: {
                tooltip: { callbacks: { title: function(context) { const d = new Date(context[0].parsed.x); return new Intl.DateTimeFormat('da-DK', { dateStyle: 'full' }).format(d); } } },
                annotation: { annotations: annotations }
            }
        }
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
    const year = mondayDate.getFullYear();
    
    weeklyOverviewTitle.textContent = `Ugentligt Overblik: Uge ${weekNum}, ${year}`;
    weeklyBarChart.innerHTML = ''; 

    weekDays.forEach(day => {
        const dayDate = new Date(day.date);
        const headerEl = document.createElement('div');
        headerEl.className = 'font-semibold text-slate-600 text-sm';
        headerEl.innerHTML = `${new Intl.DateTimeFormat('da-DK', { weekday: 'short' }).format(dayDate)} <span class="font-normal text-slate-400">${dayDate.getDate()}/${dayDate.getMonth()+1}</span>`;
        weeklyBarChart.appendChild(headerEl);
    });

    weekDays.forEach(day => {
        const dayContainer = document.createElement('div');
        dayContainer.className = 'h-48 flex flex-col-reverse p-1 bg-gray-50 rounded';
        const tss = estimateTssFromPlan(day.plan);
        const loadPercentage = Math.min(100, (tss / 150) * 100);
        if (day.plan.toLowerCase().includes('styrke') && day.plan.toLowerCase().includes('løb')) {
            const runTss = estimateTssFromPlan(day.plan.split('+')[0]);
            const strengthTss = estimateTssFromPlan(day.plan.split('+')[1]);
            const runLoad = Math.min(100, (runTss / 150) * 100);
            const strengthLoad = Math.min(100, (strengthTss / 150) * 100);
            dayContainer.appendChild(createTrainingBlock({ plan: 'Styrke', load: strengthLoad, type: 'strength' }));
            dayContainer.appendChild(createTrainingBlock({ plan: 'Løb', load: runLoad, type: 'run' }));
        } else if (!day.isRestDay) {
            const type = day.plan.toLowerCase().includes('styrke') ? 'strength' : (day.plan.toLowerCase().includes('mål') ? 'race' : 'run');
            dayContainer.appendChild(createTrainingBlock({ plan: day.plan, load: loadPercentage, type: type }));
        }
        weeklyBarChart.appendChild(dayContainer);
    });

    planDetailsView.innerHTML = `
        <div class="week-header"><h4 class="font-bold text-lg">Uge ${weekNum}, ${year}</h4></div>
        ${weekDays.map(day => {
            const dayDate = new Date(day.date);
            const dayName = new Intl.DateTimeFormat('da-DK', { weekday: 'long' }).format(dayDate);
            const dateStr = `${dayDate.getDate()}/${dayDate.getMonth()+1}`;
            return `<div class="day-row"><strong class="text-slate-600">${dayName} ${dateStr}</strong><span>${day.plan}</span></div>`
        }).join('')}
    `;
}

function createTrainingBlock({ plan, load, type }) {
    const colors = { run: '#0284c7', strength: '#7c3aed', race: '#f97316' };
    const shortTitles = { run: 'Løb', strength: 'Styrke', race: 'Race' };
    const block = document.createElement('div');
    block.className = 'training-block';
    block.style.height = `${load}%`;
    block.style.backgroundColor = colors[type] || '#64748b';
    block.title = plan;
    const text = document.createElement('div');
    text.className = 'training-text';
    const planParts = plan.match(/\(([^)]+)\)/);
    const time = planParts ? planParts[1] : '';
    text.innerHTML = `${shortTitles[type]}<br>${time}`;
    block.appendChild(text);
    return block;
}

// --- KNAP-FUNKTIONALITET (Rettet) ---

function resetPlan() {
    // Fjerner planen fra browserens hukommelse
    localStorage.removeItem('activePlan');
    // Genindlæser siden for at sikre, at alle dele af appen (kalender, etc.) opdateres
    location.reload();
}

export function initializePlanPage() {
    const savedPlan = localStorage.getItem('activePlan');
    if (savedPlan) {
        activePlan = JSON.parse(savedPlan);
        activePlan.sort((a, b) => new Date(a.date) - new Date(b.date));
        renderPlanPage();
    } else {
        renderPlanPage();
    }

    // Listener for "Importer"-knappen
    document.getElementById('plan-import-btn')?.addEventListener('click', () => {
        document.getElementById('plan-file-input')?.click();
    });

    // Listener for når en fil er valgt i "Importer"
    document.getElementById('plan-file-input')?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Gemmer den nye plan i browserens hukommelse
                localStorage.setItem('activePlan', e.target.result);
                // Genindlæser siden for at sikre, at alle dele af appen opdateres med den nye plan
                location.reload();
            } catch (error) {
                console.error("Fejl ved indlæsning af planfil:", error);
                alert("Ugyldig planfil.");
            }
        };
        reader.readAsText(file);
    });

    // Listener for "Nulstil"-knappen
    document.getElementById('reset-plan-btn')?.addEventListener('click', resetPlan);

    // Listeners for uge-navigation
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
}

export function getActivePlan() {
    const plan = localStorage.getItem('activePlan');
    return plan ? JSON.parse(plan) : [];
}