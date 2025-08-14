// js/modules/utils.js

export function estimateTssFromPlan(planText) {
    if (!planText) return 0;
    const text = planText.toLowerCase();

    // Tjek for løb (A, B, C-mål) først
    if (text.startsWith('a-mål')) return 150;
    if (text.startsWith('b-mål')) return 120;
    if (text.startsWith('c-mål')) return 90;
    if (text.includes('hvile') || text.includes('restitution')) return 15;

    let durationInMinutes = 0;
    const hourMatch = text.match(/(\d+(\.\d+)?)\s*t/);
    if (hourMatch) {
        durationInMinutes = parseFloat(hourMatch[1]) * 60;
    } else {
        const minMatch = text.match(/(\d+)\s*min/);
        if (minMatch) {
            durationInMinutes = parseInt(minMatch[1], 10);
        }
    }

    let baseTssPerHour = 50; // Default for "andet"
    if (text.includes('langtur')) baseTssPerHour = 65;
    if (text.includes('tempo') || text.includes('rpe 7-8')) baseTssPerHour = 90;
    if (text.includes('bakke') || text.includes('intervaller')) baseTssPerHour = 105;
    if (text.includes('let løb') || text.includes('rpe 3-4')) baseTssPerHour = 50;
    if (text.includes('styrke')) baseTssPerHour = 35;

    if (durationInMinutes > 0) {
        return Math.round((baseTssPerHour / 60) * durationInMinutes);
    }
    
    return baseTssPerHour;
}