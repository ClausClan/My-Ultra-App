// main.js - ENDELIG VERSION  (13. AUGUST 2025)

import { initializeCalendar } from './modules/calendarManager.js';
import { updateHomePageDashboard } from './modules/chartManager.js';
import { initializePlanPage, getActivePlan } from './modules/planManager.js';
import { initializeAnalysePage } from './modules/analyseManager.js';
import { initializeStravaConnection } from './modules/stravaManager.js';

// --- GLOBALE VARIABLER ---
let supabaseClient = null;
let userProfile = null; // Her gemmer vi den indlæste profil

// --- HJÆLPEFUNKTIONER ---

async function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    try {
        const response = await fetch('/api/get-supabase-config');
        if (!response.ok) throw new Error('Could not fetch Supabase config');
        const config = await response.json();
        supabaseClient = supabase.createClient(config.url, config.anonKey);
        return supabaseClient;
    } catch (error) {
        console.error("Failed to initialize Supabase client:", error);
        return null;
    }
}

function collectProfileDataFromForm() {
    const profileData = {};
    document.querySelectorAll('#loberdata .data-input').forEach(input => {
        if (input.value) profileData[input.id] = input.value;
    });

    const hiddenPicUrlInput = document.getElementById('profilePictureUrl');
    if (hiddenPicUrlInput && hiddenPicUrlInput.value) {
        profileData.profilePicture = hiddenPicUrlInput.value;
    }

    const zoneTypes = { hr: 'hr_zones', power: 'power_zones', pace: 'pace_zones' };
    for (const prefix in zoneTypes) {
        const arrayKey = zoneTypes[prefix];
        profileData[arrayKey] = [];
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`${prefix}Zone${i}`);
            if (input) profileData[arrayKey].push(input.value || null);
        }
    }
    return profileData;
}

function populateFormWithProfileData(profileData) {
    if (!profileData) return;

    document.querySelectorAll('#loberdata .data-input').forEach(input => {
        input.value = profileData[input.id] || '';
    });
    
    const profilePicPreview = document.getElementById('profilePicturePreview');
    const hiddenPicUrlInput = document.getElementById('profilePictureUrl');
    if (profileData.profilePicture) {
        profilePicPreview.src = profileData.profilePicture;
        profilePicPreview.style.display = 'block';
        if(hiddenPicUrlInput) hiddenPicUrlInput.value = profileData.profilePicture;
    } else {
        if(profilePicPreview) profilePicPreview.style.display = 'none';
        if(hiddenPicUrlInput) hiddenPicUrlInput.value = '';
    }

    const zoneTypes = { hr: 'hr_zones', power: 'power_zones', pace: 'pace_zones' };
    for (const prefix in zoneTypes) {
        const arrayKey = zoneTypes[prefix];
        for (let i = 1; i <= 5; i++) {
            const input = document.getElementById(`${prefix}Zone${i}`);
            if (input) {
                const value = (profileData[arrayKey] && profileData[arrayKey][i - 1]) ? profileData[arrayKey][i - 1] : '';
                input.value = value;
            }
        }
    }
    
    initializeProfilePageCalculations();
}

async function loadProfileData() {
    try {
        const response = await fetch('/api/get-profile');
        if (!response.ok) {
            if (response.status === 404 || response.status === 204) {
                 console.log("Ingen profil fundet i databasen. Det er ok.");
                 return;
            }
            throw new Error('Serverfejl ved hentning af profil');
        }
        userProfile = await response.json(); // Gem data i den globale variabel
        
        populateFormWithProfileData(userProfile);
        personalizeDashboard(userProfile?.runnerName, userProfile?.profilePicture);

    } catch (error) {
        console.error("Fejl ved indlæsning af profil:", error);
    }
}

function initializeProfilePageCalculations() {
    const runnerDobInput = document.getElementById('runnerDob');
    const calculatedAgeEl = document.getElementById('calculatedAge');
    
    const calculateAge = (dobString) => {
        if (!dobString) return '-';
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };
    
    runnerDobInput?.addEventListener('input', () => {
        if(calculatedAgeEl) calculatedAgeEl.textContent = calculateAge(runnerDobInput.value);
    });

    if (runnerDobInput && runnerDobInput.value) {
         if(calculatedAgeEl) calculatedAgeEl.textContent = calculateAge(runnerDobInput.value);
    }
}

function personalizeDashboard(name, pictureUrl) {
    const nameEl = document.getElementById('dashboard-runner-name');
    const thumbEl = document.getElementById('dashboard-thumbnail');

    if (nameEl && name) {
        nameEl.textContent = `Velkommen, ${name}`;
    } else if (nameEl) {
        nameEl.textContent = `Min Løberprofil`;
    }

    if (thumbEl && pictureUrl) {
        thumbEl.src = pictureUrl;
        thumbEl.style.display = 'block';
    } else if (thumbEl) {
        thumbEl.style.display = 'none';
        thumbEl.src = '';
    }
}

function updateHomepageStatus() {
    const planStatusText = document.getElementById('planStatusText');
    const todayTrainingText = document.getElementById('todayTrainingText');
    const activePlan = getActivePlan();

    if (activePlan && activePlan.length > 0) {
        planStatusText.textContent = `Aktiv plan er indlæst. God træning!`;
        const today = new Date().toISOString().split('T')[0];
        const todaysTraining = activePlan.find(day => day.date === today);
        todayTrainingText.textContent = todaysTraining ? todaysTraining.plan : 'Ingen træning planlagt i dag.';
    } else {
        planStatusText.textContent = 'Ingen aktiv plan. Importer en plan for at komme i gang.';
        todayTrainingText.textContent = 'Ingen træning planlagt i dag.';
    }
}

// --- APPENS "MOTOR" ---
document.addEventListener('DOMContentLoaded', function() {
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'profilePictureUrl';
    document.body.appendChild(hiddenInput);
    
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.page).classList.add('active');
            
            // NYT: Hver gang vi går til "Hjem", opdateres dashboardet med de seneste data
            if (button.dataset.page === 'hjem' && userProfile) {
                personalizeDashboard(userProfile.runnerName, userProfile.profilePicture);
            }
        });
    });

    const profilePicInput = document.getElementById('profilePictureInput');
    profilePicInput?.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const supabase = await getSupabaseClient();
        if (!supabase) return alert("Fejl: Kunne ikke forbinde til storage-servicen.");

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        alert("Uploader billede...");
        try {
            await supabase.storage.from('profile-pictures').upload(filePath, file);
            const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
            
            document.getElementById('profilePicturePreview').src = publicUrl;
            document.getElementById('profilePicturePreview').style.display = 'block';
            document.getElementById('profilePictureUrl').value = publicUrl;
            
            alert('Billedet er uploadet. Husk at trykke "Gem Profil i Database".');
        } catch (error) {
            console.error('Fejl ved upload af billede:', error);
            alert(`Fejl: ${error.message}`);
        }
    });
    
    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
        const saveButton = document.getElementById('saveProfileBtn');
        saveButton.textContent = "Gemmer...";
        saveButton.disabled = true;
        const profileData = collectProfileDataFromForm();
        try {
            const response = await fetch('/api/save-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            if (!response.ok) throw new Error("Serveren kunne ikke gemme profilen.");
            
            userProfile = profileData; // OPDATER den globale variabel
            personalizeDashboard(userProfile.runnerName, userProfile.profilePicture);
            saveButton.textContent = "Profil Gemt!";
        } catch (error) {
            console.error("Fejl ved at gemme profil:", error);
            saveButton.textContent = "Fejl - Prøv Igen";
        } finally {
            setTimeout(() => {
                saveButton.textContent = "Gem Profil i Database";
                saveButton.disabled = false;
            }, 2000);
        }
    });

    document.getElementById('exportProfileBtn')?.addEventListener('click', () => {
        const profileData = collectProfileDataFromForm();
        const dataStr = JSON.stringify(profileData, null, 2);
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const link = document.createElement('a');
        link.download = 'min_ultra_app_profil.json';
        link.href = URL.createObjectURL(dataBlob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });

    const loadProfileBtn = document.getElementById('loadProfileBtn');
    const profileFileInput = document.getElementById('profileFileInput');
    loadProfileBtn?.addEventListener('click', () => profileFileInput.click());

    profileFileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                populateFormWithProfileData(importedData);
                alert('Profilen er indlæst. Tryk på "Gem Profil i Database" for at gemme ændringerne permanent.');
            } catch (error) {
                console.error("Fejl ved indlæsning af profilfil:", error);
                alert("Ugyldig profilfil.");
            }
        };
        reader.readAsText(file);
    });

    initializeCalendar();
    loadProfileData();
    updateHomePageDashboard();
    initializePlanPage();
    initializeProfilePageCalculations();
    updateHomepageStatus();
    initializeAnalysePage();
    initializeStravaConnection();
});