// ─── Women's Day Utility — Date guards, release logic, bad-word filter ───

/** March 8, 2026 09:00 AM IST = 03:30 UTC */
export const WD_RELEASE_TIME = new Date('2026-03-08T03:30:00Z');

/** Opt-in window: Unlocked for testing (March 1–6) */
export const WD_OPTIN_START = new Date('2026-03-01T00:00:00+05:30');
export const WD_OPTIN_END = new Date('2026-03-06T23:59:59+05:30');

/** Message sending window: Unlocked for testing (March 1–7) */
export const WD_SEND_START = new Date('2026-03-01T00:00:00+05:30');
export const WD_SEND_END = new Date('2026-03-07T23:59:59+05:30');

/** Auto-deactivate participants after March 9 */
export const WD_DEACTIVATE = new Date('2026-03-09T00:00:00+05:30');

export const isOptInWindowOpen = () => { const n = new Date(); return n >= WD_OPTIN_START && n <= WD_OPTIN_END; };
export const isSendWindowOpen = () => { const n = new Date(); return n >= WD_SEND_START && n <= WD_SEND_END; };
export const isMessagesReleased = () => new Date() >= WD_RELEASE_TIME;
export const isFeatureActive = () => new Date() < WD_DEACTIVATE;

/** Time remaining until March 8 release — { days, hours, mins, secs } */
export function timeToRelease() {
    const diff = WD_RELEASE_TIME - new Date();
    if (diff <= 0) return null;
    const total = Math.floor(diff / 1000);
    return {
        days: Math.floor(total / 86400),
        hours: Math.floor((total % 86400) / 3600),
        mins: Math.floor((total % 3600) / 60),
        secs: total % 60,
    };
}

// ─── Bad-Word Filter ─────────────────────────────────────────────────────────
// Curated English + common transliteration list (extend as needed)
const BAD_WORDS = [
    // English
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'whore',
    'slut', 'rape', 'nigger', 'faggot', 'retard', 'idiot', 'stupid', 'dumb',
    // Common Tamil transliteration
    'punda', 'otha', 'naaye', 'thevidiya', 'koothi', 'sunni', 'lavada', 'baadu',
    'poolay', 'pakoda', 'vennai', 'sootha', 'kaanom'
];

export function filterMessage(text) {
    if (!text) return { isClean: true, flaggedWords: [], sanitized: '' };
    const lower = text.toLowerCase();
    const found = BAD_WORDS.filter(w => lower.includes(w));
    const sanitized = found.reduce(
        (t, w) => t.replace(new RegExp(w, 'gi'), '⬛'.repeat(w.length)), text
    );
    return { isClean: found.length === 0, flaggedWords: found, sanitized };
}
