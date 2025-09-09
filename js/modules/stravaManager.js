const API_URL = 'https://www.strava.com/api/v3';

// --- Token Management ---
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('strava_refresh_token');
    if (!refreshToken) throw new Error("Mangler refresh token. Forbind venligst igen.");

    // Kald vores nye, sikre backend-endpoint
    const response = await fetch('/api/strava-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) throw new Error("Kunne ikke forny access token via serveren.");

    const data = await response.json();
    localStorage.setItem('strava_access_token', data.access_token);
    localStorage.setItem('strava_refresh_token', data.refresh_token);
    localStorage.setItem('strava_token_expires_at', data.expires_at);
    
    console.log("Strava access token blev fornyet sikkert.");
    return data.access_token;
}

async function getValidAccessToken() {
    const expiresAt = localStorage.getItem('strava_token_expires_at');
    const nowInSeconds = Math.floor(Date.now() / 1000);

    // Forny 5 min før det udløber for en sikkerheds skyld
    if (!expiresAt || nowInSeconds + 300 > expiresAt) {
        return await refreshAccessToken();
    }
    return localStorage.getItem('strava_access_token');
}

// --- API-kald (nu eksporteret igen) ---
export async function fetchActivities() {
    const accessToken = await getValidAccessToken();
    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);

    const response = await fetch(`${API_URL}/athlete/activities?after=${ninetyDaysAgo}&per_page=200`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) throw new Error("Kunne ikke hente aktiviteter fra Strava.");
    return await response.json();
}

async function redirectToStrava() {
  try {
    const response = await fetch('/api/strava-config');
    if (!response.ok) throw new Error('Kunne ikke hente Strava konfiguration.');
    
    const config = await response.json();
    const redirectUri = window.location.origin; // Bruger appens rod-URL
    const scope = 'read,activity:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${config.clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;

    window.location.href = authUrl;
  } catch (error) {
    console.error('Fejl ved omdirigering til Strava:', error);
    alert('Der opstod en fejl. Kunne ikke forbinde til Strava.');
  }
}

// Denne funktion opdaterer blot UI'et på profilsiden
export function initializeStravaConnection() {
    const connectBtn = document.getElementById('connectStravaBtn');
    const disconnectBtn = document.getElementById('disconnectStravaBtn');
    const statusEl = document.getElementById('stravaStatus');
    const athleteInfo = JSON.parse(localStorage.getItem('strava_athlete_info'));

    if (athleteInfo) {
        if(connectBtn) connectBtn.style.display = 'none';
        if(disconnectBtn) disconnectBtn.style.display = 'block';
        if(statusEl) statusEl.innerHTML = `Forbundet som: <strong>${athleteInfo.firstname} ${athleteInfo.lastname}</strong>`;
    } else {
        if(connectBtn) connectBtn.style.display = 'block';
        if(disconnectBtn) disconnectBtn.style.display = 'none';
        if(statusEl) statusEl.textContent = 'Ikke forbundet.';
    }

    connectBtn?.addEventListener('click', redirectToStrava);
    
    disconnectBtn?.addEventListener('click', () => {
        localStorage.removeItem('strava_access_token');
        localStorage.removeItem('strava_refresh_token');
        localStorage.removeItem('strava_token_expires_at');
        localStorage.removeItem('strava_athlete_info');
        location.reload();
    });
}