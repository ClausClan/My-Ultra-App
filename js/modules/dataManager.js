function estimateTssFromPlan(planText) {
    const text = planText.toLowerCase();
    if (text.includes('hvile') || text.includes('restitution')) return 0;
    if (text.includes('generalprøve') || text.includes('langtur') && (text.includes('4.5') || text.includes('5.5'))) return 130;
    if (text.includes('langtur')) return 100;
    if (text.includes('rpe 7-8') || text.includes('intervaller') || text.includes('tempo')) return 85;
    if (text.includes('rpe 6-7')) return 70;
    if (text.includes('let bakketræning') || text.includes('rpe 5')) return 55;
    if (text.includes('let løb') || text.includes('rpe 3-4')) return 40;
    return 30; // Default for very light activity
}

export function loadAllData() {
    const allInputs = document.querySelectorAll('.data-input');
    allInputs.forEach(input => {
        const savedValue = localStorage.getItem(input.dataset.id);
        if (savedValue) {
            if (input.type === 'checkbox') {
                input.checked = savedValue === 'true';
            } else {
                input.value = savedValue;
            }
        }
    });
}

export function exportData() {
    const dataToExport = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== 'ultraAppActivePlan' && key !== 'ultraAppActivePlanName' && key !== 'geminiApiKey') {
            dataToExport[key] = localStorage.getItem(key);
        }
    }
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const link = document.createElement('a');
    link.download = 'min_ultra_app_data.json';
    link.href = URL.createObjectURL(dataBlob);
    link.click();
    URL.revokeObjectURL(link.href);
}

export function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            for (const key in importedData) {
                localStorage.setItem(key, importedData[key]);
            }
            localStorage.setItem('ultraAppImportedDataName', file.name);
            location.reload();
        } catch (error) {
            console.error("Fejl ved indlæsning af datafil:", error);
            alert("Ugyldig datafil. Vælg venligst en korrekt formateret .json fil.");
        }
    };
    reader.readAsText(file);
}

export function getDailyData(plan) {
    const dailyData = [];
    if (!plan || plan.length === 0) return [];
    
    plan.forEach(item => {
        dailyData.push({
            date: item.date,
            hrv: parseFloat(localStorage.getItem(`hrv-${item.date}`)),
            rhr: parseFloat(localStorage.getItem(`rhr-${item.date}`)),
            sleep: parseFloat(localStorage.getItem(`sleep-${item.date}`)),
            actualPte: parseFloat(localStorage.getItem(`pte-${item.date}`)) || 0,
            power: parseFloat(localStorage.getItem(`power-${item.date}`)),
            hr: parseFloat(localStorage.getItem(`hr-${item.date}`)),
            vo2max: parseFloat(localStorage.getItem(`vo2max-${item.date}`)),
            isBenchmark: localStorage.getItem(`isBenchmark-${item.date}`) === 'true',
            plannedTss: estimateTssFromPlan(item.plan)
        });
    });
    dailyData.sort((a, b) => new Date(a.date) - new Date(b.date));
    return dailyData;
}

// NEW FUNCTION
export function resetAppData() {
    // A user confirmation would be ideal here, but avoiding standard dialogs per instructions.
    // This action is destructive.
    localStorage.clear();
    location.reload();
}
