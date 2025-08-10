
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_URL = 'https://www.strava.com/api/v3';

// --- Token Management ---

// Tjekker om det nuværende access token er udløbet og henter et nyt, hvis nødvendigt.
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('strava_refresh_token');
    if (!refreshToken) throw new Error("Mangler refresh token. Forbind venligst igen.");

    const payload = {
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    };

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Kunne ikke forny access token.");

    const data = await response.json();
    localStorage.setItem('strava_access_token', data.access_token);
    localStorage.setItem('strava_refresh_token', data.refresh_token);
    localStorage.setItem('strava_token_expires_at', data.expires_at);
    
    console.log("Strava access token blev fornyet.");
    return data.access_token;
}

// Henter et gyldigt access token, og fornyer det om nødvendigt.
async function getValidAccessToken() {
    const expiresAt = localStorage.getItem('strava_token_expires_at');
    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (nowInSeconds + 300 > expiresAt) { // Forny 5 min før det udløber
        return await refreshAccessToken();
    }
    
    return localStorage.getItem('strava_access_token');
}

// --- API-kald ---

// Henter aktiviteter for de sidste 90 dage
export async function fetchActivities() {
    const accessToken = await getValidAccessToken();
    const now = new Date();
    const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90));
    const afterTimestamp = Math.floor(ninetyDaysAgo.getTime() / 1000);

    const response = await fetch(`${API_URL}/athlete/activities?after=${afterTimestamp}&per_page=200`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) throw new Error("Kunne ikke hente aktiviteter fra Strava.");
    
    const activities = await response.json();
    // Gem aktiviteterne for at undgå at hente dem hele tiden
    localStorage.setItem('strava_activities', JSON.stringify(activities));
    console.log(`${activities.length} aktiviteter hentet fra Strava.`);
    return activities;
}

export async function fetchActivityDetails(activityId) {
    const accessToken = await getValidAccessToken();
    const activityUrl = `${API_URL}/activities/${activityId}`;
    
    // TILFØJET: 'watts' er tilføjet til listen af streams, vi anmoder om
    const streamsUrl = `${API_URL}/activities/${activityId}/streams?keys=time,heartrate,cadence,velocity_smooth,watts&key_by_type=true`;

    // Hent både aktivitetsoversigt og streams samtidigt
    const [activityResponse, streamsResponse] = await Promise.all([
        fetch(activityUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(streamsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } })
    ]);

    if (!activityResponse.ok) throw new Error(`Kunne ikke hente aktivitetsdetaljer: ${activityResponse.statusText}`);
    if (!streamsResponse.ok) console.warn(`Kunne ikke hente streams for aktivitet ${activityId}.`);

    const summary = await activityResponse.json();
    const streams = streamsResponse.ok ? await streamsResponse.json() : {};

    console.log("Detaljer og streams (inkl. watt) for aktivitet hentet.");
    // Returner et samlet objekt med både summary og streams
    return { summary, streams };
}

// --- Initialisering (fra forrige trin, let justeret) ---

function redirectToStrava() {
    const redirectUri = window.location.href.split('?')[0];
    const scope = 'read,activity:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
    window.location.href = authUrl;
}

async function getTokens(code) {
    const response = await fetch('/api/strava-auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code })
    });

    if (!response.ok) {
        throw new Error("Kunne ikke hente tokens fra serveren.");
    }
    
    const data = await response.json();
    
    // Gem de modtagne data (tokens, athlete info osv.) i localStorage
    localStorage.setItem('strava_access_token', data.access_token);
    localStorage.setItem('strava_refresh_token', data.refresh_token);
    localStorage.setItem('strava_token_expires_at', data.expires_at);
    localStorage.setItem('strava_athlete_info', JSON.stringify(data.athlete));

    // Genindlæs siden for at opdatere UI (eller opdater UI dynamisk)
    window.location.href = window.location.pathname; // Fjerner query-parametre fra URL
}

function handleOAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        console.log("Strava kode modtaget. Henter tokens...");
        // Vis en loading-besked til brugeren
        document.body.innerHTML = '<h1>Forbinder til Strava, vent venligst...</h1>';
        getTokens(code);
    }
}

export function initializeStravaConnection() {
    const connectBtn = document.getElementById('connectStravaBtn');
    const statusEl = document.getElementById('stravaStatus');
    const athleteInfo = JSON.parse(localStorage.getItem('strava_athlete_info'));

    if (athleteInfo) {
        connectBtn.style.display = 'none';
        statusEl.innerHTML = `Forbundet til Strava som: <strong>${athleteInfo.firstname} ${athleteInfo.lastname}</strong>`;
    } else {
        if(connectBtn) connectBtn.style.display = 'block';
        connectBtn?.addEventListener('click', redirectToStrava);
    }
    handleOAuthRedirect();
}