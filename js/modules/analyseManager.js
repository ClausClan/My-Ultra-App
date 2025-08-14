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

// Funktion til at beregne faktisk TSS fra en log.
// Simpel model: PTE * 20 (kan justeres)
function calculateActualTss(log) {
    if (log && log.pte) {
        return log.pte * 20;
    }
    return 0; // Returner 0 hvis der ikke er data
}


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

// ERSTAT din gamle renderPerformanceChart-funktion med denne KORREKTE version

function renderPerformanceChart(allLogs, activePlan, userProfile) {
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;
    if (performanceChart) performanceChart.destroy();
    if (!activePlan || activePlan.length === 0) return;

    let ctl = parseFloat(userProfile?.startingCtl) || 0;
    let atl = parseFloat(userProfile?.startingAtl) || 0;

    const CTL_CONST = 42, ATL_CONST = 7;
    const ctlData = [], atlData = [], tsbData = [];
    const raceAnnotations = {}; // Gør klar til mål-streger
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

        // Find og tilføj mål-streger
        const planForDay = activePlan.find(p => p.date === dateKey);
        if (planForDay) {
            const planText = planForDay.plan.toLowerCase();
            if (planText.startsWith('a-mål:') || planText.startsWith('b-mål:') || planText.startsWith('c-mål:')) {
                let borderColor = '#facc15', labelContent = 'C-Mål';
                if (planText.startsWith('a-mål:')) { borderColor = '#e11d48'; labelContent = 'A-Mål'; }
                else if (planText.startsWith('b-mål:')) { borderColor = '#f97316'; labelContent = 'B-Mål'; }
                raceAnnotations[dateKey] = { type: 'line', xMin: dateKey, xMax: dateKey, borderColor, borderWidth: 2, label: { content: labelContent, display: true, position: 'start', yAdjust: -10 } };
            }
        }
    }

    const formZones = {
        peakZone: { type: 'box', yMin: 15, yMax: 25, backgroundColor: 'rgba(250, 204, 21, 0.15)', borderColor: 'transparent', label: { content: 'Peak', display: true, position: 'start', color: 'rgba(120, 90, 0, 0.5)', font: { size: 10 } } },
        freshZone: { type: 'box', yMin: 5, yMax: 15, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'transparent', label: { content: 'Frisk', display: true, position: 'start', color: 'rgba(0, 100, 0, 0.5)', font: { size: 10 } } },
    };

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [ /* ... uændret ... */ ] },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { type: 'time', time: { unit: 'week' } }, y: { title: { display: true, text: 'Score' } } },
            plugins: {
                title: { display: true, text: 'Progression: Aktuel vs. Planlagt', font: { size: 16 } },
                annotation: {
                    // RETTET: Her fletter vi de to objekter sammen
                    annotations: {
                        ...formZones, // ...først baggrunds-zonerne
                        ...raceAnnotations // ...og så de lodrette streger for mål
                    }
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