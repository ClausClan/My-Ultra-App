export function generatePlanHTML(planData) {
    const planContainer = document.getElementById('training-plan');
    const planPlaceholder = document.getElementById('plan-placeholder');
    
    planContainer.innerHTML = ''; // Clear existing plan
    if (!planData || planData.length === 0) {
        planContainer.appendChild(planPlaceholder);
        planPlaceholder.style.display = 'block';
        return;
    }
    planPlaceholder.style.display = 'none';

    planData.forEach(item => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        dayDiv.dataset.date = item.date;

        let html = `<h3>Uge ${item.week}: ${item.day} <span class="date">${new Date(item.date).toLocaleDateString('da-DK', {day:'numeric', month:'numeric'})}</span></h3>
                    <div class="plan-details"><p><strong>Plan:</strong> ${item.plan}</p></div>`;

        if (item.isRaceDay) {
            dayDiv.style.borderColor = '#e67e22';
            dayDiv.style.borderWidth = '2px';
        } else {
            html += `<div class="section-title">Morgen Status</div>
                     <div class="daily-grid">
                         <div class="input-group"><label>HRV</label><input type="number" class="data-input" data-type="hrv" data-id="hrv-${item.date}"></div>
                         <div class="input-group"><label>Hvilepuls</label><input type="number" class="data-input" data-type="rhr" data-id="rhr-${item.date}"></div>
                         <div class="input-group"><label>Søvnkvalitet (1-5)</label><input type="number" class="data-input" data-type="sleep" data-id="sleep-${item.date}"></div>
                     </div>`;
            if (!item.isRestDay) {
                html += `<div class="section-title">Træningsdata</div>
                         <div class="daily-grid">
                             <div class="input-group"><label>PTE</label><input type="number" step="0.1" class="data-input" data-type="pte" data-id="pte-${item.date}"></div>
                             <div class="input-group"><label>Gns. Watt</label><input type="number" class="data-input" data-type="power" data-id="power-${item.date}"></div>
                             <div class="input-group"><label>Gns. Puls</label><input type="number" class="data-input" data-type="hr" data-id="hr-${item.date}"></div>
                             <div class="input-group"><label>VO2max</label><input type="number" step="0.1" class="data-input" data-type="vo2max" data-id="vo2max-${item.date}"></div>
                         </div>
                         <div class="checkbox-group">
                             <input type="checkbox" class="data-input" data-type="isBenchmark" data-id="isBenchmark-${item.date}" id="isBenchmark-${item.date}">
                             <label for="isBenchmark-${item.date}">Marker som Effektivitets-Test</label>
                         </div>`;
            }
            html += `<textarea class="data-input" data-type="notes" data-id="notes-${item.date}" placeholder="Noter om dagen..."></textarea>`;
        }
        dayDiv.innerHTML = html;
        planContainer.appendChild(dayDiv);
    });
}

export function updateFileNameDisplays() {
    const planFileNameDisplay = document.getElementById('planFileName');
    const dataFileNameDisplay = document.getElementById('dataFileName');
    const planName = localStorage.getItem('ultraAppActivePlanName');
    const dataName = localStorage.getItem('ultraAppImportedDataName');
    planFileNameDisplay.textContent = planName ? `Aktiv plan: ${planName}` : '';
    dataFileNameDisplay.textContent = dataName ? `Seneste data-import: ${dataName}` : '';
}

export function setupInputEventListeners() {
    const allInputs = document.querySelectorAll('.data-input');
    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            const valueToSave = input.type === 'checkbox' ? input.checked : input.value;
            localStorage.setItem(input.dataset.id, valueToSave);
        });
    });
}
