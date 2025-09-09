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