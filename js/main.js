import { initializeCalendar } from './modules/calendarManager.js';
import { updateHomePageDashboard } from './modules/chartManager.js';
import { initializePlanPage, getActivePlan } from './modules/planManager.js';
import { initializeAnalysePage } from './modules/analyseManager.js';
import { initializeStravaConnection } from './modules/stravaManager.js';

// --- FUNKTION: Opdaterer dashboard med navn og billede ---
function personalizeDashboard() {
    const name = localStorage.getItem('runnerName');
    const pictureSrc = localStorage.getItem('profilePicture');

    const nameEl = document.getElementById('dashboard-runner-name');
    const thumbEl = document.getElementById('dashboard-thumbnail');

    if (nameEl && name) {
        nameEl.textContent = `Velkommen, ${name}`;
    } else if (nameEl) {
        nameEl.textContent = `Min Løberprofil`;
    }

    if (thumbEl && pictureSrc) {
        thumbEl.src = pictureSrc;
        thumbEl.style.display = 'block';
    } else if (thumbEl) {
        thumbEl.style.display = 'none';
    }
}

// --- FUNKTION: Håndterer logik på Løberdata-siden ---
function initializeProfilePage() {
    const runnerDobInput = document.getElementById('runnerDob');
    const calculatedAgeEl = document.getElementById('calculatedAge');
    const profilePicInput = document.getElementById('profilePictureInput');
    const profilePicPreview = document.getElementById('profilePicturePreview');

    const calculateAge = (dobString) => {
        if (!dobString) return '-';
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    
    profilePicInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            localStorage.setItem('profilePicture', dataUrl);
            profilePicPreview.src = dataUrl;
            profilePicPreview.style.display = 'block';
            personalizeDashboard();
        };
        reader.readAsDataURL(file);
    });
    
    runnerDobInput?.addEventListener('input', () => {
        calculatedAgeEl.textContent = calculateAge(runnerDobInput.value);
    });
    
    const savedDob = localStorage.getItem('runnerDob');
    if (savedDob) {
        runnerDobInput.value = savedDob;
        calculatedAgeEl.textContent = calculateAge(savedDob);
    }

    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) {
        profilePicPreview.src = savedPic;
        profilePicPreview.style.display = 'block';
    } else {
        profilePicPreview.style.display = 'none';
    }
}

// --- NY FUNKTION: Opdaterer Plan Status og Dagens Træning på forsiden ---
function updateHomepageStatus() {
    const planStatusText = document.getElementById('planStatusText');
    const todayTrainingText = document.getElementById('todayTrainingText');
    const activePlan = getActivePlan(); // Henter planen via planManager

    if (activePlan && activePlan.length > 0) {
        planStatusText.textContent = `Aktiv plan er indlæst. God træning!`;
        
        const today = new Date().toISOString().split('T')[0];
        const todaysTraining = activePlan.find(day => day.date === today);

        if (todaysTraining) {
            todayTrainingText.textContent = todaysTraining.plan;
        } else {
            todayTrainingText.textContent = 'Ingen træning planlagt i dag.';
        }
    } else {
        planStatusText.textContent = 'Ingen aktiv plan. Importer en plan for at komme i gang.';
        todayTrainingText.textContent = 'Ingen træning planlagt i dag.';
    }
}


document.addEventListener('DOMContentLoaded', function() {
    // --- NAVIGATION ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            button.classList.add('active');
            const pageId = button.dataset.page;
            document.getElementById(pageId).classList.add('active');

            if (pageId === 'hjem') {
                updateHomePageDashboard();
                personalizeDashboard();
                updateHomepageStatus(); // Kald den her også
            }
        });
    });

    // --- LØBERDATA (RUNNER DATA) SAVING ---
    const dataInputs = document.querySelectorAll('#loberdata .data-input');
    dataInputs.forEach(input => {
        const savedValue = localStorage.getItem(input.id);
        if (savedValue) input.value = savedValue;
        input.addEventListener('input', () => localStorage.setItem(input.id, input.value));
    });
    
    // --- PROFIL HÅNDTERING (GEM/INDLÆS) ---
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const loadProfileBtn = document.getElementById('loadProfileBtn');
    const profileFileInput = document.getElementById('profileFileInput');
    
    saveProfileBtn?.addEventListener('click', () => {
        const profileData = {};
        const allDataInputs = document.querySelectorAll('#loberdata .data-input');
        allDataInputs.forEach(input => {
            profileData[input.id] = input.value;
        });
        const profilePictureData = localStorage.getItem('profilePicture');
        if (profilePictureData) {
            profileData['profilePicture'] = profilePictureData;
        }
        const dataStr = JSON.stringify(profileData, null, 2);
        const dataBlob = new Blob([dataStr], {type: "application/json"});
        const link = document.createElement('a');
        link.download = 'brugerProfil.json';
        link.href = URL.createObjectURL(dataBlob);
        link.click();
        URL.revokeObjectURL(link.href);
    });

    loadProfileBtn?.addEventListener('click', () => profileFileInput.click());

    profileFileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                const allDataInputs = document.querySelectorAll('#loberdata .data-input');
                allDataInputs.forEach(input => {
                    if (importedData[input.id]) {
                        input.value = importedData[input.id];
                        localStorage.setItem(input.id, importedData[input.id]);
                    }
                });
                if (importedData['profilePicture']) {
                    const pictureData = importedData['profilePicture'];
                    localStorage.setItem('profilePicture', pictureData);
                    document.getElementById('profilePicturePreview').src = pictureData;
                    document.getElementById('profilePicturePreview').style.display = 'block';
                }
                initializeProfilePage();
                personalizeDashboard();
            } catch (error) {
                console.error("Fejl ved indlæsning af profil:", error);
                alert("Ugyldig profilfil.");
            }
        };
        reader.readAsText(file);
    });

    // --- INITIALIZE MODULES & PAGES ---
    initializeCalendar();
    updateHomePageDashboard();
    initializePlanPage();
    initializeProfilePage();
    personalizeDashboard();
    updateHomepageStatus(); // Kald funktionen ved start
    initializeAnalysePage();
    initializeStravaConnection();
});