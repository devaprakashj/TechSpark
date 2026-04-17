// Special Days Theme Configuration
// This utility checks if today is a special day and returns theme configuration

// 🔧 TEST MODE - Set to true to preview Republic Day theme
// ⚠️ IMPORTANT: Set this to FALSE before production deployment!
const TEST_MODE = false; // Production mode - only activates on actual date

export const getSpecialDayTheme = () => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const date = today.getDate();

    // Republic Day - January 26 (or TEST_MODE)
    if ((month === 1 && date === 26) || TEST_MODE) {
        return {
            isSpecialDay: true,
            name: 'Republic Day',
            emoji: '🇮🇳',
            message: 'Happy 77th Republic Day! Jai Hind! 🇮🇳',
            colors: {
                primary: '#FF9933', // Saffron
                secondary: '#FFFFFF', // White
                accent: '#138808', // Green
                gradient: 'linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)',
                tricolor: ['#FF9933', '#FFFFFF', '#138808']
            },
            classes: {
                navbarBorder: 'border-b-4 border-gradient-tricolor',
                buttonGradient: 'from-[#FF9933] via-white to-[#138808]',
                textGradient: 'bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] bg-clip-text text-transparent',
                glowSaffron: 'shadow-[0_0_30px_rgba(255,153,51,0.3)]',
                glowGreen: 'shadow-[0_0_30px_rgba(19,136,8,0.3)]'
            }
        };
    }

    // Independence Day - August 15
    if (month === 8 && date === 15) {
        return {
            isSpecialDay: true,
            name: 'Independence Day',
            emoji: '🇮🇳',
            message: 'Happy Independence Day! Jai Hind! 🇮🇳',
            colors: {
                primary: '#FF9933',
                secondary: '#FFFFFF',
                accent: '#138808',
                gradient: 'linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)',
                tricolor: ['#FF9933', '#FFFFFF', '#138808']
            },
            classes: {
                navbarBorder: 'border-b-4 border-gradient-tricolor',
                buttonGradient: 'from-[#FF9933] via-white to-[#138808]',
                textGradient: 'bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808] bg-clip-text text-transparent'
            }
        };
    }

    // No special day - return normal theme
    return {
        isSpecialDay: false,
        name: null,
        emoji: null,
        message: null,
        colors: null,
        classes: null
    };
};

// Check if we should show the theme (allows for testing)
export const isRepublicDay = () => {
    const today = new Date();
    return today.getMonth() === 0 && today.getDate() === 26; // January 26
};

export const isIndependenceDay = () => {
    const today = new Date();
    return today.getMonth() === 7 && today.getDate() === 15; // August 15
};
