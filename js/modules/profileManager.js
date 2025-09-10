// Fil: js/modules/profileManager.js

import { authenticatedFetch } from './utils.js';

// Funktion til at beregne og vise alder
function calculateAndDisplayAge() {
    const dobInput = document.getElementById('runnerDob');
    const ageDisplay = document.getElementById('calculatedAge');

    if (dobInput && ageDisplay && dobInput.value) {
        const birthDate = new Date(dobInput.value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        ageDisplay.textContent = age >= 0 ? `${age} år` : '-';
    } else if (ageDisplay) {
        ageDisplay.textContent = '-';
    }
}

// Funktion til at indlæse data fra databasen og udfylde formularen
export async function loadProfile() {
    try {
        const response = await authenticatedFetch('/api/get-profile');
        if (response.status === 204) {
            console.log('Ingen profil fundet for brugeren.');
            return null;
        }
        if (!response.ok) throw new Error('Failed to fetch profile');
        
        const profileData = await response.json();
        const profileForm = document.getElementById('loberdata');
        if (!profileForm) return profileData;

        for (const dbKey in profileData) {
            const value = profileData[dbKey];
                        if (dbKey === 'profilePicture' && value) {
                const imgPreview = document.getElementById('profilePicturePreview');
                if (imgPreview) {
                    imgPreview.src = value;
                    imgPreview.style.display = 'block';
                }
                continue; // Gå videre til næste felt
            }

            if ((dbKey === 'hr_zones' || dbKey === 'power_zones' || dbKey === 'pace_zones') && Array.isArray(value)) {
                let prefix = '';
                if (dbKey === 'hr_zones') prefix = 'hrZone';
                if (dbKey === 'power_zones') prefix = 'powerZone';
                if (dbKey === 'pace_zones') prefix = 'paceZone';
                
                value.forEach((zoneValue, index) => {
                    const elementId = `${prefix}${index + 1}`;
                    const inputElement = profileForm.querySelector(`[id="${elementId}"]`);
                    if (inputElement) inputElement.value = zoneValue || '';
                });
            } else {
                const camelCaseId = dbKey.replace(/(_\w)/g, (m) => m[1].toUpperCase());
                const inputElement = profileForm.querySelector(`[id="${camelCaseId}"]`);
                if (inputElement) inputElement.value = value || '';
            }
        }
        calculateAndDisplayAge();
        return profileData;
    } catch (error) {
        console.error('Kunne ikke hente profil:', error);
        return null;
    }
}

// Funktion til at samle data fra formularen og gemme til databasen
async function saveProfile() {
    const profileForm = document.getElementById('loberdata');
    if (!profileForm) return;

    const dataToSave = {};

    // Saml simple værdier (og oversæt til snake_case)
    dataToSave.runner_name = profileForm.querySelector('#runnerName').value;
    dataToSave.runner_dob = profileForm.querySelector('#runnerDob').value;
    // ... tilføj alle andre simple felter her på samme måde
    dataToSave.runner_experience = profileForm.querySelector('#runnerExperience').value;

    // Saml zone-værdier fra 5 felter til ét array
    dataToSave.hr_zones = [];
    for (let i = 1; i <= 5; i++) {
        dataToSave.hr_zones.push(profileForm.querySelector(`#hrZone${i}`).value);
    }
    // ... gør det samme for power_zones og pace_zones

    try {
        const response = await authenticatedFetch('/api/save-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave),
        });
        if (!response.ok) throw new Error('Failed to save profile');
        console.log('Profil auto-gemt!'); // Ændret fra alert til console.log for en bedre brugeroplevelse
    } catch (error) {
        console.error('Fejl ved auto-gem af profil:', error);
    }
}

// Funktion til at aktivere autosave på alle felter
export function initializeAutosave() {
    const inputsToAutosave = document.querySelectorAll('#loberdata .data-input, #loberdata input[type="date"], #loberdata textarea');
    inputsToAutosave.forEach(input => {
        input.addEventListener('change', () => {
            console.log(`Autosave triggered by field: ${input.id}`);
            saveProfile();
        });
    });
    console.log('Autosave er initialiseret for alle profil-felter.');
    
    const dobInput = document.getElementById('runnerDob');
    if (dobInput) {
        dobInput.addEventListener('change', calculateAndDisplayAge);
    }
}