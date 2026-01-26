// Firebase Caching Utility
// Reduces Firestore reads by caching data in sessionStorage

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Get cached data
export const getCachedData = (key) => {
    try {
        const cached = sessionStorage.getItem(`ts_cache_${key}`);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
            console.log(`[Cache HIT] ${key}`);
            return data;
        }

        // Cache expired
        console.log(`[Cache EXPIRED] ${key}`);
        sessionStorage.removeItem(`ts_cache_${key}`);
        return null;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
};

// Set cached data
export const setCachedData = (key, data) => {
    try {
        const cacheEntry = {
            data,
            timestamp: Date.now()
        };
        sessionStorage.setItem(`ts_cache_${key}`, JSON.stringify(cacheEntry));
        console.log(`[Cache SET] ${key}`);
    } catch (error) {
        console.error('Cache write error:', error);
        // If storage is full, clear old caches
        clearOldCaches();
    }
};

// Clear specific cache
export const clearCache = (key) => {
    sessionStorage.removeItem(`ts_cache_${key}`);
    console.log(`[Cache CLEAR] ${key}`);
};

// Clear all TechSpark caches
export const clearAllCaches = () => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
        if (key.startsWith('ts_cache_')) {
            sessionStorage.removeItem(key);
        }
    });
    console.log('[Cache CLEAR ALL]');
};

// Clear old caches when storage is full
const clearOldCaches = () => {
    const keys = Object.keys(sessionStorage);
    const cacheKeys = keys.filter(k => k.startsWith('ts_cache_'));

    // Remove oldest caches first
    cacheKeys.forEach(key => {
        try {
            const cached = sessionStorage.getItem(key);
            if (cached) {
                const { timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp > CACHE_DURATION) {
                    sessionStorage.removeItem(key);
                }
            }
        } catch {
            sessionStorage.removeItem(key);
        }
    });
};

// Cache keys for different data types
export const CACHE_KEYS = {
    EVENTS: 'events',
    STUDENTS: 'students',
    ORGANIZERS: 'organizers',
    REGISTRATIONS: 'registrations',
    MY_REGISTRATIONS: 'my_registrations',
    CERTIFICATES: 'certificates',
    FEEDBACK: 'feedback'
};
