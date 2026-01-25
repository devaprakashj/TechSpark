import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import ritLogo from '../assets/rit-logo.png';
import tsLogo from '../assets/techspark-logo.png';
import {
    User,
    Mail,
    Hash,
    Building2,
    Calendar,
    Phone,
    CheckCircle,
    Clock,
    Award,
    BookOpen,
    Zap,
    ExternalLink,
    AlertCircle,
    AlertTriangle,
    Download,
    QrCode,
    Rocket,
    Settings,
    CodeXml,
    Brain,
    Crown,
    Sparkles,
    Lock,
    LogOut,
    ShieldCheck,
    Smartphone,
    X,
    Loader2,
    Send,
    CalendarPlus,
    Linkedin,
    Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [availableEvents, setAvailableEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [eventToRegister, setEventToRegister] = useState(null);
    const [isRegLoading, setIsRegLoading] = useState(false);
    const [certificates, setCertificates] = useState([]);
    const [certsLoading, setCertsLoading] = useState(true);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [activeFeedbackEvent, setActiveFeedbackEvent] = useState(null);
    const [feedbackData, setFeedbackData] = useState({
        overallRating: 5,
        contentQuality: 5,
        speakerPerformance: 5,
        relevance: 5,
        timeManagement: 5,
        engagement: 5,
        coordination: 5,
        likedMost: '',
        improvements: '',
        recommend: 'Yes'
    });
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [regMode, setRegMode] = useState('INDIVIDUAL');
    const [teamName, setTeamName] = useState('');
    const [teamCodeInput, setTeamCodeInput] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [selectedProblemStatement, setSelectedProblemStatement] = useState('');
    const [customProblemStatement, setCustomProblemStatement] = useState('');
    const [isCustomProblem, setIsCustomProblem] = useState(false);
    const [selectedRegDetails, setSelectedRegDetails] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [isFetchingTeam, setIsFetchingTeam] = useState(false);
    const idCardRef = useRef(null);
    const navigate = useNavigate();

    // Quiz Modal State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [activeQuizUrl, setActiveQuizUrl] = useState('');
    const [activeQuizTitle, setActiveQuizTitle] = useState('');
    const [activeQuizRegId, setActiveQuizRegId] = useState(null);
    const [iframeLoadCount, setIframeLoadCount] = useState(0);
    const [showFinishButton, setShowFinishButton] = useState(false);
    const quizStartTime = useRef(null);
    const isQuizFinishing = useRef(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- PROCTORING SYSTEM STATE ---
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [proctorWarning, setProctorWarning] = useState('');
    const MAX_VIOLATIONS = 3;
    const [showQuizRulesModal, setShowQuizRulesModal] = useState(false);
    const [pendingQuizData, setPendingQuizData] = useState(null);

    // --- RELOAD DETECTION: Check if quiz was active before page reload ---
    useEffect(() => {
        const savedQuizState = sessionStorage.getItem('techspark_quiz_active');
        if (savedQuizState) {
            const quizData = JSON.parse(savedQuizState);
            // Restore quiz state (Note: Violation count now only increments on actual tab switches per user request)
            setShowQuizModal(true);
            setActiveQuizUrl(quizData.url);
            setActiveQuizTitle(quizData.title);
            setActiveQuizRegId(quizData.regId);
            setTabSwitchCount(quizData.violations || 0);

            alert(`⚠️ Quiz Session Restored!\n\nProctoring is active. Please complete the quiz without switching tabs.`);
        }
    }, []);

    // Live Clock Effect
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Hide body scroll and navbar when ANY modal is open
    useEffect(() => {
        const navbar = document.querySelector('nav');
        const header = document.querySelector('header');
        const isModalOpen = showQuizModal || showQuizRulesModal || showFeedbackModal;

        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `0px`; // Force to top
            if (navbar) navbar.style.display = 'none';
            if (header) header.style.display = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            if (navbar) navbar.style.display = '';
            if (header) header.style.display = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            if (navbar) navbar.style.display = '';
            if (header) header.style.display = '';
        };
    }, [showQuizModal, showQuizRulesModal, showFeedbackModal]);

    // --- PROCTORING: Tab Switch Detection ---
    useEffect(() => {
        if (!showQuizModal) return;

        const handleVisibilityChange = async () => {
            if (document.hidden && showQuizModal && !isQuizFinishing.current) {
                const newCount = tabSwitchCount + 1;
                setTabSwitchCount(newCount);
                setProctorWarning(`⚠️ TAB SWITCH DETECTED! Violation ${newCount}/${MAX_VIOLATIONS}`);

                // Log violation to Firestore
                if (activeQuizRegId) {
                    try {
                        const regRef = doc(db, 'registrations', activeQuizRegId);
                        await updateDoc(regRef, {
                            proctorViolations: newCount,
                            lastViolationAt: serverTimestamp()
                        });
                    } catch (err) {
                        console.error('Failed to log violation:', err);
                    }
                }

                // Auto-terminate on max violations
                if (newCount >= MAX_VIOLATIONS) {
                    setProctorWarning('🚨 QUIZ TERMINATED: Too many violations!');
                    if (activeQuizRegId) {
                        try {
                            const regRef = doc(db, 'registrations', activeQuizRegId);
                            await updateDoc(regRef, {
                                status: 'FLAGGED',
                                proctorViolations: newCount,
                                terminatedAt: serverTimestamp(),
                                terminationReason: 'Exceeded tab switch limit'
                            });
                        } catch (err) {
                            console.error('Failed to terminate quiz:', err);
                        }
                    }
                    setTimeout(() => {
                        alert('🚨 Your quiz has been terminated due to multiple tab switches. This attempt has been flagged for review.');
                        setShowQuizModal(false);
                        setActiveQuizUrl('');
                        setActiveQuizTitle('');
                        setActiveQuizRegId(null);
                        setIframeLoadCount(0);
                        setShowFinishButton(false);
                        setTabSwitchCount(0);
                        setProctorWarning('');
                    }, 100);
                } else {
                    // Clear warning after 5 seconds
                    setTimeout(() => setProctorWarning(''), 5000);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [showQuizModal, tabSwitchCount, activeQuizRegId]);



    // --- PROCTORING: Copy-Paste & Right-Click Block ---
    useEffect(() => {
        if (!showQuizModal) return;

        // Block right-click
        const handleContextMenu = (e) => {
            e.preventDefault();
            setProctorWarning('⚠️ Right-click is DISABLED during quiz!');
            setTimeout(() => setProctorWarning(''), 3000);
            return false;
        };

        // Block copy, cut, paste
        const handleCopy = (e) => {
            e.preventDefault();
            setProctorWarning('⚠️ Copy-Paste is DISABLED during quiz!');
            setTimeout(() => setProctorWarning(''), 3000);
            return false;
        };

        // Block text selection
        const handleSelectStart = (e) => {
            e.preventDefault();
            return false;
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('cut', handleCopy);
        document.addEventListener('paste', handleCopy);
        document.addEventListener('selectstart', handleSelectStart);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('cut', handleCopy);
            document.removeEventListener('paste', handleCopy);
            document.removeEventListener('selectstart', handleSelectStart);
        };
    }, [showQuizModal]);

    // --- PROCTORING: Keyboard Shortcut Block ---
    useEffect(() => {
        if (!showQuizModal) return;

        const handleKeyDown = async (e) => {
            const blockedKeys = [
                // Developer tools
                { key: 'F12' },
                { key: 'I', ctrl: true, shift: true }, // Ctrl+Shift+I
                { key: 'J', ctrl: true, shift: true }, // Ctrl+Shift+J
                { key: 'C', ctrl: true, shift: true }, // Ctrl+Shift+C
                { key: 'U', ctrl: true }, // Ctrl+U (View Source)
                // Screenshot
                { key: 'PrintScreen' },
                { key: 'S', ctrl: true, shift: true }, // Ctrl+Shift+S (Screenshot)
                // Browser navigation
                { key: 'T', ctrl: true }, // New Tab
                { key: 'N', ctrl: true }, // New Window
                { key: 'W', ctrl: true }, // Close Tab
                { key: 'Tab', alt: true }, // Alt+Tab
                // Copy-Paste shortcuts
                { key: 'C', ctrl: true },
                { key: 'V', ctrl: true },
                { key: 'X', ctrl: true },
                { key: 'A', ctrl: true }, // Select All
                // Page Refresh - BLOCKED
                { key: 'F5' }, // F5 refresh
                { key: 'r', ctrl: true }, // Ctrl+R refresh
                { key: 'R', ctrl: true }, // Ctrl+Shift+R hard refresh
            ];

            const isBlocked = blockedKeys.some(blocked => {
                const keyMatch = e.key === blocked.key || e.code === blocked.key;
                const ctrlMatch = blocked.ctrl ? (e.ctrlKey || e.metaKey) : true;
                const shiftMatch = blocked.shift ? e.shiftKey : true;
                const altMatch = blocked.alt ? e.altKey : true;
                return keyMatch && ctrlMatch && shiftMatch && altMatch;
            });

            if (isBlocked) {
                e.preventDefault();
                e.stopPropagation();

                // Special handling for refresh attempts
                if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
                    setProctorWarning('🚫 PAGE REFRESH is DISABLED during quiz! Complete your quiz to continue.');
                    setTimeout(() => setProctorWarning(''), 4000);
                    return false;
                }

                // Special handling for dev tools attempts
                // Special handling for refresh attempts
                if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
                    setProctorWarning('🚫 PAGE REFRESH is DISABLED during quiz! Complete your quiz to continue.');
                    setTimeout(() => setProctorWarning(''), 4000);
                    return false;
                }

                // Block keys but don't count as violation (per user request: "tab switch only")
                setProctorWarning('⚠️ This action is BLOCKED during quiz!');
                setTimeout(() => setProctorWarning(''), 3000);
                return false;
            }
        };

        // Block before unload (closing/refreshing)
        const handleBeforeUnload = (e) => {
            if (isQuizFinishing.current) return;
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave? Your quiz progress may be lost!';
            return e.returnValue;
        };

        // Block browser back button (including mobile back)
        const handlePopState = (e) => {
            if (isQuizFinishing.current) return;
            e.preventDefault();
            // Push state back to prevent navigation
            window.history.pushState(null, '', window.location.href);
            setProctorWarning('⚠️ BACK BUTTON is DISABLED! Complete the quiz first.');
            setTimeout(() => setProctorWarning(''), 4000);
        };

        // Push initial state to enable popstate blocking
        window.history.pushState(null, '', window.location.href);
        window.history.pushState(null, '', window.location.href);

        document.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [showQuizModal, tabSwitchCount, activeQuizRegId]);

    // Quiz Auto-Completion Logic
    const handleQuizCompletion = async () => {
        if (!activeQuizRegId || isQuizFinishing.current) return;

        isQuizFinishing.current = true;

        try {
            // Get event data before clearing states (needed for feedback modal)
            const completedReg = registrations.find(r => r.id === activeQuizRegId);
            const completedEvent = allEvents.find(e => e.id === completedReg?.eventId);

            const regRef = doc(db, 'registrations', activeQuizRegId);
            await updateDoc(regRef, {
                status: 'Completed',
                isAttended: true,
                quizCompletedAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });

            // Clear session storage on successful completion
            sessionStorage.removeItem('techspark_quiz_active');

            setShowQuizModal(false);
            setActiveQuizUrl('');
            setActiveQuizTitle('');
            setActiveQuizRegId(null);
            setIframeLoadCount(0);
            setShowFinishButton(false);
            setTabSwitchCount(0);
            quizStartTime.current = null;

            // Exit fullscreen if active
            if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
                if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => { });
                else if (document.msExitFullscreen) document.msExitFullscreen().catch(() => { });
            }

            // For Quiz events - Open feedback modal after completion
            if (completedEvent && completedEvent.type === 'Quiz') {
                alert("✨ BRAVO! Quiz Submission Verified. Your participation has been recorded! 🚀\n\nPlease share your feedback to complete the process.");

                // Open feedback modal for the quiz event
                setTimeout(() => {
                    setActiveFeedbackEvent(completedEvent);
                    setShowFeedbackModal(true);
                }, 500);
            } else {
                alert("✨ BRAVO! Quiz Submission Verified. Your participation has been recorded and your dashboard is now updated to COMPLETED! 🚀");
            }
        } catch (error) {
            console.error("Error updating quiz status:", error);
        }
    };

    const handleIframeLoad = () => {
        if (!showQuizModal) return;

        const newCount = iframeLoadCount + 1;
        setIframeLoadCount(newCount);
        console.log(`Quiz Iframe Loaded. Current Count: ${newCount}`);

        if (newCount === 1) {
            // First load: User just opened the quiz
            quizStartTime.current = Date.now();

            // Fallback: Show button after 15 seconds even if they don't reload
            // This is safe since exit button is removed, they need a way to finish.
            setTimeout(() => {
                setShowFinishButton(true);
                console.log("Activity timeout reached. Finish button enabled.");
            }, 15000);
        } else {
            // Subsequent loads: User likely clicked Next or Submit
            const timeSpent = (Date.now() - quizStartTime.current) / 1000;
            console.log(`Time spent in quiz: ${timeSpent} seconds`);

            // Heuristic: If they spent more than 5 seconds, it's a real interaction.
            if (timeSpent > 5) {
                setShowFinishButton(true);
                console.log("Activity detected via reload. Finish button enabled.");
            }
        }
    };

    const fetchTeamDetails = async (reg) => {
        if (!reg?.isTeamRegistration || !reg?.teamCode) {
            setTeamMembers([]);
            return;
        }
        setIsFetchingTeam(true);
        try {
            const q = query(
                collection(db, 'registrations'),
                where('eventId', '==', reg.eventId),
                where('teamCode', '==', reg.teamCode)
            );
            const snapshot = await getDocs(q);
            const members = snapshot.docs.map(doc => doc.data());
            setTeamMembers(members);
        } catch (error) {
            console.error("Error fetching team:", error);
        } finally {
            setIsFetchingTeam(false);
        }
    };

    // Generate Google Calendar URL for event
    const generateCalendarUrl = (reg) => {
        const eventData = allEvents.find(e => e.id === reg.eventId);
        const title = encodeURIComponent(`TechSpark: ${reg.eventTitle}`);
        const venue = encodeURIComponent(eventData?.venue || 'RIT Chennai Campus');
        const description = encodeURIComponent(`📍 TechSpark Club Event\n\n🎯 Event: ${reg.eventTitle}\n🕐 Time: ${reg.eventTime}\n📍 Venue: ${eventData?.venue || 'TBA'}\n\n✅ Registration ID: ${reg.id}\n\nPowered by TechSpark Club - RIT Chennai`);

        // Parse date and time
        let startDate = '';
        let endDate = '';
        try {
            // Attempt to parse eventDate (e.g., "Jan 20, 2026")
            const dateStr = reg.eventDate || '';
            const timeStr = reg.eventTime || '10:00 AM';

            // Create a date object
            const eventDateObj = new Date(dateStr);
            if (!isNaN(eventDateObj.getTime())) {
                // Parse time (e.g., "10:00 AM" or "10:00 AM - 12:00 PM")
                const timeParts = timeStr.split('-')[0].trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
                if (timeParts) {
                    let hours = parseInt(timeParts[1]);
                    const minutes = parseInt(timeParts[2]);
                    const period = timeParts[3].toUpperCase();
                    if (period === 'PM' && hours !== 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    eventDateObj.setHours(hours, minutes, 0, 0);
                }

                // Format for Google Calendar (YYYYMMDDTHHMMSS)
                const formatDate = (d) => {
                    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                };

                startDate = formatDate(eventDateObj);
                const endDateObj = new Date(eventDateObj.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
                endDate = formatDate(endDateObj);
            }
        } catch (e) {
            console.error('Date parsing error:', e);
        }

        const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
        const url = `${baseUrl}&text=${title}&dates=${startDate}/${endDate}&details=${description}&location=${venue}&sf=true&output=xml`;

        return url;
    };

    // Generate Quiz URL with pre-filled student data
    const generateQuizUrl = (reg) => {
        const eventData = allEvents.find(e => e.id === reg.eventId);

        console.log('=== QUIZ URL DEBUG ===');
        console.log('Event Data:', eventData);
        console.log('User Data:', user);
        console.log('Quiz Form URL:', eventData?.quizFormUrl);
        console.log('Quiz Entry IDs:', {
            name: eventData?.quizEntryName,
            roll: eventData?.quizEntryRoll,
            dept: eventData?.quizEntryDept,
            year: eventData?.quizEntryYear,
            section: eventData?.quizEntrySection,
            mobile: eventData?.quizEntryMobile
        });

        if (!eventData || eventData.type !== 'Quiz' || !eventData.quizFormUrl) {
            console.log('Quiz URL generation failed: Missing event data or not a quiz');
            return null;
        }

        // Clean the base URL - remove any existing query params to start fresh
        let baseUrl = eventData.quizFormUrl;
        if (baseUrl.includes('?')) {
            baseUrl = baseUrl.split('?')[0];
        }

        const params = ['usp=pp_url']; // Required for Google Forms pre-fill

        // Add pre-fill parameters if entry IDs are configured
        if (eventData.quizEntryName && user.fullName) {
            params.push(`${eventData.quizEntryName}=${encodeURIComponent(user.fullName)}`);
            console.log('Added Name:', user.fullName);
        }
        if (eventData.quizEntryRoll && user.rollNumber) {
            params.push(`${eventData.quizEntryRoll}=${encodeURIComponent(user.rollNumber)}`);
            console.log('Added Roll:', user.rollNumber);
        }
        if (eventData.quizEntryDept && user.department) {
            params.push(`${eventData.quizEntryDept}=${encodeURIComponent(user.department)}`);
            console.log('Added Dept:', user.department);
        }
        if (eventData.quizEntryYear && user.yearOfStudy) {
            params.push(`${eventData.quizEntryYear}=${encodeURIComponent(user.yearOfStudy)}`);
            console.log('Added Year:', user.yearOfStudy);
        }
        if (eventData.quizEntrySection && user.section) {
            params.push(`${eventData.quizEntrySection}=${encodeURIComponent(user.section)}`);
            console.log('Added Section:', user.section);
        }
        if (eventData.quizEntryMobile && user.phone) {
            params.push(`${eventData.quizEntryMobile}=${encodeURIComponent(user.phone)}`);
            console.log('Added Mobile:', user.phone);
        }

        const finalUrl = `${baseUrl}?${params.join('&')}`;
        console.log('Final Quiz URL:', finalUrl);

        return finalUrl;
    };

    const handleFeedbackSubmit = async () => {
        if (!activeFeedbackEvent || !user) return;
        setSubmittingFeedback(true);
        try {
            const feedbackId = `${activeFeedbackEvent.id}_${user.uid}`;
            await setDoc(doc(db, 'feedback', feedbackId), {
                eventId: activeFeedbackEvent.id,
                eventTitle: activeFeedbackEvent.title,
                studentId: user.uid,
                studentName: user.fullName,
                studentRoll: user.rollNumber,
                studentDept: user.department,
                studentYear: user.yearOfStudy,
                // New 10 Fields
                overallRating: feedbackData.overallRating,
                contentQuality: feedbackData.contentQuality,
                speakerPerformance: feedbackData.speakerPerformance,
                relevance: feedbackData.relevance,
                timeManagement: feedbackData.timeManagement,
                engagement: feedbackData.engagement,
                coordination: feedbackData.coordination,
                likedMost: feedbackData.likedMost,
                improvements: feedbackData.improvements,
                recommend: feedbackData.recommend,
                submittedAt: serverTimestamp()
            });

            // Update registration to mark feedback as submitted and set status to Completed
            const regId = registrations.find(r => r.eventId === activeFeedbackEvent.id).id;
            await updateDoc(doc(db, 'registrations', regId), {
                feedbackSubmitted: true,
                status: 'Completed',
                eligibleForCertificate: true
            });

            alert("Thank you! Feedback submitted. You are now eligible to receive your certificate. 🎓🚀");
            setShowFeedbackModal(false);
            setFeedbackData({
                overallRating: 5,
                contentQuality: 5,
                speakerPerformance: 5,
                relevance: 5,
                timeManagement: 5,
                engagement: 5,
                coordination: 5,
                likedMost: '',
                improvements: '',
                recommend: 'Yes'
            });
        } catch (error) {
            console.error("Feedback error:", error);
            alert("Failed to submit feedback. Try again.");
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const handleDownloadCard = () => {
        if (idCardRef.current === null) return;

        toPng(idCardRef.current, { cacheBust: true, pixelRatio: 3 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `TS-ID-${user.rollNumber}.png`;
                link.href = dataUrl;
                link.click();
                alert("Your TechSpark Digital Identity has been downloaded! 🎊");
            })
            .catch((err) => {
                console.error('Error generating card:', err);
                alert("Failed to download card. Please try again.");
            });
    };

    useEffect(() => {
        if (!user) return;

        // Fetch Registrations - Removed orderBy to ensure instant local update even with pending serverTimestamp
        const qRegs = query(
            collection(db, 'registrations'),
            where('userId', '==', user.uid)
        );

        const unsubscribeRegs = onSnapshot(qRegs, (snapshot) => {
            const regs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort locally to handle the order
            const sortedRegs = regs.sort((a, b) => {
                const dateA = a.registeredAt?.toDate?.() || new Date();
                const dateB = b.registeredAt?.toDate?.() || new Date();
                return dateB - dateA;
            });
            setRegistrations(sortedRegs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching registrations:", error);
            setLoading(false);
        });

        // Fetch Available Events - Removed server-side where/orderBy to avoid index requirements & ensure instant visibility
        const qEvents = query(collection(db, 'events'));

        const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
            const evs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setAllEvents(evs);

            // Filter and Sort locally: Only show LIVE/CLOSED and sort by newest
            // Also filter by audience targeting
            const filteredEvents = evs
                .filter(e => ['LIVE', 'CLOSED'].includes(e.status))
                .filter(e => {
                    // Check audience targeting
                    const audienceType = e.audienceType || 'Whole College';

                    if (audienceType === 'Whole College') {
                        return true; // Everyone can see
                    }

                    // Convert student year to Roman numeral format
                    const yearMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', 'I': 'I', 'II': 'II', 'III': 'III', 'IV': 'IV' };
                    const studentYear = yearMap[user.yearOfStudy] || user.yearOfStudy;
                    const studentDept = user.department?.toUpperCase();
                    const studentSection = user.section?.toUpperCase();

                    if (audienceType === 'Department Wise') {
                        const targetDepts = (e.departments || []).map(d => d.toUpperCase());
                        return targetDepts.length === 0 || targetDepts.includes(studentDept);
                    }

                    if (audienceType === 'Year Wise') {
                        const targetYears = e.years || [];
                        return targetYears.length === 0 || targetYears.includes(studentYear);
                    }

                    if (audienceType === 'Section Wise' || audienceType === 'Custom') {
                        const targetDepts = (e.departments || []).map(d => d.toUpperCase());
                        const targetYears = e.years || [];
                        const targetSections = (e.sections || []).map(s => s.toUpperCase());

                        const deptMatch = targetDepts.length === 0 || targetDepts.includes(studentDept);
                        const yearMatch = targetYears.length === 0 || targetYears.includes(studentYear);
                        const sectionMatch = targetSections.length === 0 || targetSections.includes(studentSection);

                        return deptMatch && yearMatch && sectionMatch;
                    }

                    return true;
                })
                .sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

            setAvailableEvents(filteredEvents);
        }, (error) => {
            console.error("Error fetching events:", error);
        });

        return () => {
            unsubscribeRegs();
            unsubscribeEvents();
        };
    }, [user]);

    // Fetch Certificates from GAS API
    useEffect(() => {
        if (!user?.rollNumber) return;

        const fetchCertificates = async () => {
            try {
                const savedUrl = localStorage.getItem('certApiUrl');
                const defaultUrl = 'https://script.google.com/macros/s/AKfycbxZvWwaHjkFrS_yK3akleByW1FtmnWu7ht-UYt6ztPbTTnWUuGUmhjZ_HsOWdu5aHruFw/exec';
                const apiUrl = (!savedUrl || savedUrl.includes('AKfycbVm9lozobl') || savedUrl.includes('AKfycbzkMhn07pp') || savedUrl.includes('AKfycbS_2h3kCOMCtzGf'))
                    ? defaultUrl
                    : savedUrl.trim();

                const separator = apiUrl.includes('?') ? '&' : '?';
                const finalUrl = `${apiUrl}${separator}query=${encodeURIComponent(user.rollNumber)}`;

                const response = await fetch(finalUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setCertificates(data);
                    } else if (data &&
                        data.status !== 'not_found' &&
                        data.status !== 'not found' &&
                        data.status !== 'error' &&
                        !data.message) {
                        setCertificates([data]);
                    } else {
                        setCertificates([]);
                    }
                }
            } catch (error) {
                console.error("Error fetching certificates:", error);
            } finally {
                setCertsLoading(false);
            }
        };

        fetchCertificates();
    }, [user.rollNumber]);

    const handleRegister = async (event) => {
        if (!user) return;

        try {
            // 1. Check if already registered
            const regId = `${event.id}_${user.uid}`;
            const regRef = doc(db, 'registrations', regId);
            const regSnap = await getDoc(regRef);

            if (regSnap.exists()) {
                alert("You have already registered for this event! ✅");
                return;
            }

            // Open confirmation flow
            setEventToRegister(event);
            setRegMode(event.isTeamEvent ? 'TEAM_CREATE' : 'INDIVIDUAL');
            setTeamName('');
            setTeamCodeInput('');
            setVerificationError('');
            setSelectedProblemStatement('');
            setCustomProblemStatement('');
            setIsCustomProblem(false);
            setIsConfirming(true);
        } catch (error) {
            console.error("Auth check error:", error);
        }
    };

    const handleVerifyTeamCode = async () => {
        if (!teamCodeInput || !eventToRegister) return;
        setVerificationError('');
        setIsRegLoading(true);
        try {
            const q = query(
                collection(db, 'registrations'),
                where('teamCode', '==', teamCodeInput.toUpperCase())
            );
            const querySnapshot = await getDocs(q);

            const teammates = querySnapshot.docs.filter(doc => doc.data().eventId === eventToRegister.id);
            const leaderDoc = teammates.find(doc => doc.data().teamRole === 'LEADER');

            if (!leaderDoc) {
                setVerificationError("Invalid Team Code for this event. Please verify with your leader.");
            } else {
                const teamData = leaderDoc.data();
                const currentSize = teammates.length;
                const maxSize = eventToRegister.maxTeamSize || 4;

                if (currentSize >= maxSize) {
                    setVerificationError(`This squad (${teamData.teamName}) is already full (${currentSize}/${maxSize}).`);
                    setTeamName('');
                } else {
                    setTeamName(teamData.teamName);
                    alert(`Team Found: ${teamData.teamName}. Current members: ${currentSize}/${maxSize}. Proceed to join!`);
                }
            }
        } catch (error) {
            console.error("Team Verification Error:", error);
            setVerificationError("Encryption breach during verification. Try again.");
        } finally {
            setIsRegLoading(false);
        }
    };

    const confirmRegistration = async () => {
        if (!user || !eventToRegister) return;
        setIsRegLoading(true);

        try {
            const regId = `${eventToRegister.id}_${user.uid}`;
            const regRef = doc(db, 'registrations', regId);

            let generatedTeamCode = '';
            if (regMode === 'TEAM_CREATE') {
                if (!teamName.trim()) {
                    alert("A squad name is required for tactical deployment!");
                    setIsRegLoading(false);
                    return;
                }
                generatedTeamCode = `TS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            }

            if (regMode === 'TEAM_JOIN' && !teamName) {
                alert("Please verify your squad code before authorizing.");
                setIsRegLoading(false);
                return;
            }

            // Register for the event
            await setDoc(regRef, {
                eventId: eventToRegister.id,
                eventTitle: eventToRegister.title,
                eventDate: eventToRegister.date,
                eventTime: eventToRegister.time || (eventToRegister.date?.includes('|') ? eventToRegister.date.split('|')[1].trim() : 'TBA'),
                userId: user.uid,
                studentName: user.fullName,
                studentEmail: user.email,
                studentPhone: user.phone || 'N/A',
                studentRoll: user.rollNumber,
                studentDept: user.department,
                studentYear: user.yearOfStudy,
                studentSection: user.section || 'N/A',
                registeredAt: serverTimestamp(),
                status: 'Upcoming',

                // Team Info
                isTeamRegistration: regMode !== 'INDIVIDUAL',
                teamRole: regMode === 'TEAM_CREATE' ? 'LEADER' : (regMode === 'TEAM_JOIN' ? 'MEMBER' : 'INDIVIDUAL'),
                teamName: regMode !== 'INDIVIDUAL' ? (teamName || 'Solo Ops') : '',
                teamCode: regMode === 'TEAM_CREATE' ? generatedTeamCode : (regMode === 'TEAM_JOIN' ? teamCodeInput.toUpperCase() : ''),

                // Hackathon Specific
                problemStatement: eventToRegister.type === 'Hackathon' ? (isCustomProblem ? customProblemStatement : selectedProblemStatement) : ''
            });

            // 2. Update attendee count atomically
            const eventRef = doc(db, 'events', eventToRegister.id);
            await updateDoc(eventRef, {
                attendeesCount: increment(1)
            });

            // 3. Reward Participation Points (Spark Points)
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                points: increment(50),
                badges: (user.points + 50) >= 50 && !user.badges?.includes('active-spark')
                    ? [...(user.badges || []), 'active-spark']
                    : (user.badges || [])
            });

            setIsConfirming(false);

            if (regMode === 'TEAM_CREATE') {
                alert(`🚀 TEAM CREATED! Your Squad Name: ${teamName}. Share Code: ${generatedTeamCode} with your teammates.`);
            } else if (regMode === 'TEAM_JOIN') {
                alert(`🎉 Successfully joined squad: ${teamName}!`);
            } else {
                alert(`🎉 Successfully registered for ${eventToRegister.title}! +50 Spark Points gained. 🚀`);
            }
            setEventToRegister(null);
        } catch (error) {
            console.error("Registration error:", error);
            alert("Mission failed. Please try again.");
        } finally {
            setIsRegLoading(false);
        }
    };

    if (!user) return null;

    const certCount = certificates.length;
    const calculatedPoints = certCount * 100;

    const stats = [
        { label: 'Events Registered', value: registrations.length, icon: <Calendar className="w-5 h-5" />, color: 'blue' },
        { label: 'Events Participated', value: certCount, icon: <Rocket className="w-5 h-5" />, color: 'emerald' },
        { label: 'Participation Points', value: calculatedPoints, icon: <Award className="w-5 h-5" />, color: 'purple' },
        { label: 'Badges Unlocked', value: 0, icon: <Sparkles className="w-5 h-5" />, color: 'orange' },
    ];

    const badgeMap = [
        {
            id: 'spark-starter',
            name: 'Debut Spark',
            icon: <Rocket className="w-5 h-5" />,
            description: 'Earned your first verified certificate',
            color: 'from-blue-400 to-emerald-400',
            glow: 'shadow-blue-200',
            unlocked: certCount >= 1
        },
        {
            id: 'active-spark',
            name: 'Rising Catalyst',
            icon: <div className="relative"><Rocket className="w-5 h-5" /><Zap className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400 fill-yellow-400" /></div>,
            description: '10+ verified participations (1000 XP)',
            color: 'from-blue-500 via-yellow-400 to-blue-600',
            glow: 'shadow-yellow-200',
            unlocked: certCount >= 10
        },
        {
            id: 'builder-spark',
            name: 'Elite Contributor',
            icon: <div className="relative"><Settings className="w-5 h-5" /><CodeXml className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500" /></div>,
            description: '25+ verified participations (2500 XP)',
            color: 'from-blue-600 via-indigo-600 to-yellow-500',
            glow: 'shadow-indigo-200',
            unlocked: certCount >= 25
        },
        {
            id: 'pro-spark',
            name: 'Institutional Legend',
            icon: <div className="relative"><BookOpen className="w-5 h-5" /><Brain className="w-3 h-3 absolute -top-1 -right-1 text-cyan-400" /></div>,
            description: '50+ verified participations (5000 XP)',
            color: 'from-indigo-800 via-blue-700 to-cyan-400',
            glow: 'shadow-cyan-400/50',
            unlocked: certCount >= 50
        },
        {
            id: 'spark-leader',
            name: 'TechSpark Architect',
            icon: <div className="relative"><Crown className="w-5 h-5" /><Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-400" /></div>,
            description: '100 certificates (10000 XP) or Leadership role',
            color: 'from-blue-900 via-yellow-500 to-yellow-300',
            glow: 'shadow-yellow-400/50',
            unlocked: certCount >= 100 || user.role === 'admin' || user.role === 'core'
        }
    ];

    stats[3].value = badgeMap.filter(b => b.unlocked).length;

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="relative z-10">
                        <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-4xl font-extrabold shadow-xl border-4 border-white overflow-hidden">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.fullName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                user.fullName?.charAt(0)
                            )}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.5 }}
                                className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full p-1 shadow-lg border border-slate-100 flex items-center justify-center group cursor-pointer z-20"
                            >
                                <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center shadow-inner">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                                    VERIFIED MEMBER
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="relative z-10 flex-1 text-center md:text-left space-y-3">
                        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                            Welcome back, <span className="text-blue-600">{user.fullName?.split(' ')[0]}!</span>
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-3 gap-x-4">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider border border-slate-200/50">
                                <Building2 className="w-3.5 h-3.5" /> {user.department || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider border border-slate-200/50">
                                <Hash className="w-3.5 h-3.5" /> Section {user.section || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-wider border border-blue-100">
                                <Zap className="w-3.5 h-3.5" /> Year {user.yearOfStudy || 'N/A'}
                            </span>
                            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                <Phone className="w-3.5 h-3.5" /> +91 {user.phone || 'XXXXXXXXXX'}
                            </span>
                        </div>
                    </div>

                    <div className="relative z-10 flex gap-3">
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Stats Grid */}
                        <div id="student-overview" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.map((stat, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-blue-50 text-blue-600 uppercase">
                                        {stat.icon}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                                    <div className="text-xs text-slate-500 font-medium mt-1">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Registered Events */}
                        <div id="registered-events" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Registered Events
                                </h2>
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {registrations.length} Total
                                </span>
                            </div>
                            <div className="p-6">
                                {loading ? (
                                    <div className="flex flex-col items-center py-12 space-y-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                        <p className="text-sm text-slate-400">Loading your events...</p>
                                    </div>
                                ) : registrations.length > 0 ? (
                                    <div className="space-y-4">
                                        {registrations.map((reg, idx) => {
                                            const eventActualData = allEvents.find(e => e.id === reg.eventId);
                                            const isCheckedIn = reg.isAttended || reg.status === 'Present';
                                            const isFlagged = reg.status === 'FLAGGED' || reg.proctorViolations > 0;
                                            const currentStatus = isCheckedIn ? 'CHECKED-IN' :
                                                isFlagged ? 'FLAGGED' :
                                                    (eventActualData?.status === 'COMPLETED' ? 'COMPLETED' :
                                                        (eventActualData?.status === 'CLOSED' ? 'CLOSED' :
                                                            (reg.status === 'Registered' || !reg.status ? 'Upcoming' : reg.status)));

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedRegDetails(reg);
                                                        fetchTeamDetails(reg);
                                                    }}
                                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all duration-300 cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex flex-col items-center justify-center font-bold overflow-hidden">
                                                            {(() => {
                                                                const fullDate = reg.eventDate || '';
                                                                const datePart = fullDate.split('|')[0].trim();

                                                                if (datePart.includes('-')) {
                                                                    const [y, m, d] = datePart.split('-');
                                                                    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                                                                    return (
                                                                        <>
                                                                            <span className="text-[9px] uppercase leading-tight opacity-70">{months[parseInt(m) - 1] || '---'}</span>
                                                                            <span className="text-lg leading-tight">{d}</span>
                                                                        </>
                                                                    );
                                                                } else {
                                                                    const parts = datePart.split(' ');
                                                                    return (
                                                                        <>
                                                                            <span className="text-[9px] uppercase leading-tight opacity-70">{parts[0]}</span>
                                                                            <span className="text-lg leading-tight">{parts[1]?.replace(',', '')}</span>
                                                                        </>
                                                                    );
                                                                }
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{reg.eventTitle}</h3>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                                <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                                    <Clock className="w-3 h-3" /> {(!reg.eventTime || reg.eventTime === 'TBA') && eventActualData?.date?.includes('|')
                                                                        ? eventActualData.date.split('|')[1].trim()
                                                                        : (reg.eventTime || 'TBA')}
                                                                </p>
                                                                {reg.isTeamRegistration && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase italic">
                                                                            Squad: {reg.teamName}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {isCheckedIn && (
                                                                    <span className="text-[8px] text-emerald-600 flex items-center gap-0.5 font-black uppercase">
                                                                        <CheckCircle className="w-2 h-2" /> Verified Entry
                                                                    </span>
                                                                )}
                                                                {!isCheckedIn && currentStatus === 'Upcoming' && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(generateCalendarUrl(reg), '_blank');
                                                                        }}
                                                                        className="text-[9px] font-black text-blue-600 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100/50 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tight"
                                                                    >
                                                                        <CalendarPlus className="w-3 h-3" /> Calendar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {eventActualData?.status === 'COMPLETED' ? (
                                                            isCheckedIn ? (
                                                                reg.feedbackSubmitted ? (
                                                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase border border-blue-100">
                                                                        COMPLETED
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveFeedbackEvent({ id: reg.eventId, title: reg.eventTitle });
                                                                            setShowFeedbackModal(true);
                                                                        }}
                                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                                                    >
                                                                        SUBMIT FEEDBACK
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <span className="px-3 py-1 bg-red-50 text-red-500 rounded-full text-[10px] font-black uppercase border border-red-100 tracking-widest">
                                                                    ABSENT
                                                                </span>
                                                            )
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                {/* Quiz: Submit Feedback Button - Shows when quiz completed but feedback not submitted */}
                                                                {eventActualData?.type?.toLowerCase() === 'quiz' && isCheckedIn && !reg.feedbackSubmitted && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveFeedbackEvent({ id: reg.eventId, title: reg.eventTitle });
                                                                            setShowFeedbackModal(true);
                                                                        }}
                                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                                                    >
                                                                        SUBMIT FEEDBACK
                                                                    </button>
                                                                )}
                                                                {/* Quiz: Start Quiz Button - Shows Rules First (Only for non-flagged, upcoming, and quizEnabled) */}
                                                                {eventActualData?.type?.toLowerCase() === 'quiz' && currentStatus === 'Upcoming' && !isFlagged && !isCheckedIn && generateQuizUrl(reg) && (
                                                                    eventActualData?.quizEnabled ? (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // Store quiz data and show rules modal first
                                                                                setPendingQuizData({
                                                                                    url: generateQuizUrl(reg),
                                                                                    title: reg.eventTitle,
                                                                                    regId: reg.id
                                                                                });
                                                                                setShowQuizRulesModal(true);
                                                                            }}
                                                                            className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 flex items-center gap-1.5"
                                                                        >
                                                                            <Rocket className="w-3 h-3" /> START QUIZ
                                                                        </button>
                                                                    ) : (
                                                                        <span className="px-3 py-1.5 bg-slate-200 text-slate-500 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5">
                                                                            ⏳ Quiz Not Started Yet
                                                                        </span>
                                                                    )
                                                                )}
                                                                {/* FLAGGED Status for Quiz */}
                                                                {currentStatus === 'FLAGGED' && (
                                                                    <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase shadow-lg shadow-red-200 animate-pulse flex items-center gap-1">
                                                                        🚩 FLAGGED
                                                                    </span>
                                                                )}
                                                                {/* Normal Status Badge */}
                                                                {currentStatus !== 'FLAGGED' && (
                                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${isCheckedIn ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                                                                        currentStatus === 'Upcoming' ? 'bg-orange-50 text-orange-600' :
                                                                            'bg-slate-100 text-slate-500'
                                                                        }`}>
                                                                        {currentStatus?.toUpperCase()}
                                                                    </span>
                                                                )}
                                                                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-12 text-center space-y-3">
                                        <AlertCircle className="w-12 h-12 text-slate-200" />
                                        <p className="text-slate-500 font-medium">No registered events yet.</p>
                                        <button onClick={() => navigate('/events')} className="text-blue-600 text-sm font-bold hover:underline">
                                            Explore Events
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live Opportunities or Confirmation Area */}
                        <div id="live-events" className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                            {isConfirming && eventToRegister ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 md:p-10 text-left h-full flex flex-col"
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Mission Briefing</h2>
                                                <p className="text-[8px] md:text-[10px] text-blue-600 font-bold tracking-widest uppercase">Verified Registration Process</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsConfirming(false)}
                                            className="px-3 py-1.5 md:px-4 md:py-2 text-[8px] md:text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-1 transition-colors border border-slate-100 rounded-lg sm:border-none"
                                        >
                                            <X className="w-4 h-4" /> ABORT
                                        </button>
                                    </div>

                                    <div className="space-y-6 md:space-y-8 flex-1">
                                        <div className="p-6 md:p-8 bg-blue-50 border border-blue-100 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform hidden md:block">
                                                <Rocket className="w-16 h-16 text-blue-600" />
                                            </div>
                                            <p className="text-[9px] md:text-[10px] text-blue-500 font-extrabold uppercase tracking-[0.2em] mb-4">Target Operation:</p>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 relative z-10">
                                                <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{eventToRegister.title}</h3>
                                                <p className="text-[10px] md:text-sm font-black text-blue-600 italic font-mono uppercase tracking-tighter bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-blue-100">{eventToRegister.date}</p>
                                            </div>
                                        </div>

                                        {eventToRegister.isTeamEvent && (
                                            <div className="space-y-4">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Team Deployment Strategy</p>
                                                <div className="flex bg-slate-100 p-1.5 rounded-[1.2rem] gap-1.5">
                                                    <button
                                                        onClick={() => setRegMode('TEAM_CREATE')}
                                                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${regMode === 'TEAM_CREATE' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                                    >
                                                        Create Team
                                                    </button>
                                                    <button
                                                        onClick={() => setRegMode('TEAM_JOIN')}
                                                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${regMode === 'TEAM_JOIN' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                                    >
                                                        Join Team
                                                    </button>
                                                </div>

                                                {regMode === 'TEAM_CREATE' ? (
                                                    <div className="animate-in fade-in slide-in-from-top-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block italic">Assign Squad Designation (Team Name)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. CYBER KNIGHTS"
                                                            value={teamName}
                                                            onChange={(e) => setTeamName(e.target.value)}
                                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all uppercase"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block italic">Enter Authorization Code (Team Code)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. TS-ABCD"
                                                                value={teamCodeInput}
                                                                onChange={(e) => {
                                                                    setTeamCodeInput(e.target.value);
                                                                    setTeamName('');
                                                                    setVerificationError('');
                                                                }}
                                                                className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all uppercase"
                                                            />
                                                            <button
                                                                onClick={handleVerifyTeamCode}
                                                                disabled={isRegLoading || !teamCodeInput}
                                                                className="px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:opacity-50"
                                                            >VERIFY</button>
                                                        </div>
                                                        {verificationError && <p className="text-[9px] text-red-500 font-bold ml-1 uppercase">{verificationError}</p>}
                                                        {teamName && <p className="text-[10px] text-emerald-600 font-black ml-1 uppercase italic flex items-center gap-2 tracking-widest">
                                                            <CheckCircle className="w-4 h-4" /> AUTHENTICATED: {teamName}
                                                        </p>}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Hackathon Specific: Problem Statement Selection */}
                                        {eventToRegister.type === 'Hackathon' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                                    <p className="text-[11px] text-slate-900 font-black uppercase tracking-widest italic">Technical Directive: Problem Statement</p>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    {(eventToRegister.problemStatements || []).map((ps, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                setSelectedProblemStatement(ps);
                                                                setIsCustomProblem(false);
                                                            }}
                                                            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${selectedProblemStatement === ps && !isCustomProblem
                                                                ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20'
                                                                : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-slate-50'}`}
                                                        >
                                                            <div className="flex items-start gap-4 h-full">
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${selectedProblemStatement === ps && !isCustomProblem ? 'bg-white/20' : 'bg-slate-100'}`}>PS #{idx + 1}</span>
                                                                <p className="text-xs font-bold leading-relaxed pr-6">{ps}</p>
                                                            </div>
                                                            {selectedProblemStatement === ps && !isCustomProblem && (
                                                                <div className="absolute top-1/2 -translate-y-1/2 right-4">
                                                                    <CheckCircle className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}

                                                    {eventToRegister.allowOpenStatement && (
                                                        <div className="space-y-3">
                                                            <button
                                                                onClick={() => {
                                                                    setIsCustomProblem(true);
                                                                    setSelectedProblemStatement('');
                                                                }}
                                                                className={`w-full p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${isCustomProblem
                                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20'
                                                                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-800 hover:bg-slate-900 hover:text-white'}`}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`p-2 rounded-xl ${isCustomProblem ? 'bg-white/10' : 'bg-slate-100 group-hover:bg-white/10'}`}>
                                                                        <Zap className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest">Open Statement</p>
                                                                        <p className="text-xs font-bold">Declare a custom innovation objective</p>
                                                                    </div>
                                                                </div>
                                                                {isCustomProblem && (
                                                                    <div className="absolute top-1/2 -translate-y-1/2 right-4">
                                                                        <CheckCircle className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                            </button>

                                                            {isCustomProblem && (
                                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-1">
                                                                    <textarea
                                                                        placeholder="Describe your custom problem statement / innovation goal..."
                                                                        value={customProblemStatement}
                                                                        onChange={(e) => setCustomProblemStatement(e.target.value)}
                                                                        className="w-full h-32 px-5 py-4 bg-white border-2 border-slate-900 rounded-2xl outline-none font-bold text-slate-800 text-sm focus:ring-4 focus:ring-blue-500/5 transition-all resize-none italic"
                                                                    />
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Validation Hint */}
                                                {!selectedProblemStatement && !customProblemStatement && (
                                                    <p className="text-[9px] text-blue-600 font-bold uppercase italic animate-pulse ml-1">Selection of technical directive required for deployment.</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3 ml-1">Identity Profile</p>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 space-y-4">
                                                        <div className="flex items-center gap-4">
                                                            <User className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Name</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase truncate">{user.fullName}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 border-t border-slate-200/50 pt-4">
                                                            <Hash className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Global ID</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase truncate">{user.rollNumber}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 border-t border-slate-200/50 pt-4">
                                                            <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Mobile Link</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase">+91 {user.phone || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 border-t border-slate-200/50 pt-4">
                                                            <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Digital Signal</p>
                                                                <p className="text-[10px] md:text-[11px] font-black text-slate-800 lowercase truncate">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3 ml-1">Structural Data</p>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 space-y-4">
                                                        <div className="flex items-center gap-4">
                                                            <Building2 className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Division</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase truncate">{user.department}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 border-t border-slate-200/50 pt-4">
                                                            <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Phase System</p>
                                                                <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase truncate">YEAR {user.yearOfStudy} • SEC {user.section || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col lg:flex-row items-center gap-6 p-6 md:p-8 bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] border border-blue-500/20 shadow-xl">
                                            <div className="flex-1 text-center lg:text-left">
                                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">Final Authorization Required</p>
                                                <p className="text-[9px] text-slate-500 italic max-w-sm mx-auto lg:mx-0">By authorizing, your secure profile signature will be transmitted for logistics and entry verification.</p>
                                            </div>
                                            <button
                                                onClick={confirmRegistration}
                                                disabled={isRegLoading || (eventToRegister.type === 'Hackathon' && !selectedProblemStatement && !customProblemStatement.trim())}
                                                className="w-full lg:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 min-w-[240px] shadow-lg shadow-blue-500/20"
                                            >
                                                {isRegLoading ? (
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        AUTHORIZE SEAT <CheckCircle className="w-5 h-5" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <Rocket className="w-5 h-5 text-blue-600" />
                                            Live Opportunities
                                        </h2>
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">New Events Active</span>
                                    </div>
                                    <div className="p-6">
                                        {availableEvents.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {availableEvents.map((event) => {
                                                    const isRegistered = registrations.some(r => r.eventId === event.id || r.eventTitle === event.title);
                                                    return (
                                                        <div key={event.id} className="p-5 bg-white border border-slate-200 rounded-[2rem] hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-[2rem] flex items-center justify-center -mr-2 -mt-2 group-hover:bg-blue-600 transition-colors">
                                                                <ExternalLink className="w-5 h-5 text-blue-200 group-hover:text-white" />
                                                            </div>
                                                            <div className="mb-4 text-left">
                                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">{event.type || 'WORKSHOP'}</span>
                                                                <h3 className="text-lg font-black text-slate-800 mt-2 uppercase leading-snug group-hover:text-blue-600 transition-colors">{event.title}</h3>
                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3" /> {event.date}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                                        <Building2 className="w-3 h-3" /> {event.venue}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isRegistered ? (
                                                                <div className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> REGISTERED
                                                                </div>
                                                            ) : (event.status === 'CLOSED' || event.registrationOpen === false) ? (
                                                                <div className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 border border-slate-100">
                                                                    <Lock className="w-3.5 h-3.5" /> REGISTRATION CLOSED
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleRegister(event)}
                                                                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] hover:bg-blue-600 transition-all"
                                                                >
                                                                    REGISTER NOW
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-12 flex flex-col items-center text-center">
                                                <Rocket className="w-12 h-12 text-slate-100 mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active opportunities just yet</p>
                                                <p className="text-slate-300 text-[10px] mt-2 italic font-medium">Keep an eye out for updates!</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Certificate Vault */}
                        <div id="certificate-vault" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50/20">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-blue-600" />
                                    Certificate Vault
                                </h2>
                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                    {certificates.length} Verified
                                </span>
                            </div>
                            <div className="p-6">
                                {certsLoading ? (
                                    <div className="flex flex-col items-center py-8 space-y-3">
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accessing Secure Records...</p>
                                    </div>
                                ) : certificates.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {certificates.map((cert, idx) => {
                                            // Determine role styling
                                            const roleStyles = {
                                                'WINNER_1ST': { bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', text: 'text-white', label: '🥇 1st Place', border: 'border-yellow-300' },
                                                'WINNER_2ND': { bg: 'bg-gradient-to-r from-slate-300 to-slate-400', text: 'text-white', label: '🥈 2nd Place', border: 'border-slate-300' },
                                                'WINNER_3RD': { bg: 'bg-gradient-to-r from-amber-600 to-amber-700', text: 'text-white', label: '🥉 3rd Place', border: 'border-amber-400' },
                                                'SPECIAL_MENTION': { bg: 'bg-gradient-to-r from-purple-500 to-indigo-500', text: 'text-white', label: '⭐ Special', border: 'border-purple-300' },
                                                'PARTICIPANT': { bg: 'bg-slate-100', text: 'text-slate-600', label: '🎖️ Participant', border: 'border-slate-200' }
                                            };
                                            const role = cert.role || 'PARTICIPANT';
                                            const roleStyle = roleStyles[role] || roleStyles['PARTICIPANT'];

                                            // Determine event type styling
                                            const typeStyles = {
                                                'Hackathon': { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🔮' },
                                                'Workshop': { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🛠️' },
                                                'Quiz': { bg: 'bg-green-100', text: 'text-green-700', icon: '📝' },
                                                'Competition': { bg: 'bg-pink-100', text: 'text-pink-700', icon: '🏆' },
                                                'Seminar': { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🎤' }
                                            };
                                            const eventType = cert.eventType || 'Workshop';
                                            const typeStyle = typeStyles[eventType] || typeStyles['Workshop'];

                                            const isWinner = role.includes('WINNER');

                                            return (
                                                <div key={idx} className={`p-5 rounded-[2rem] border-2 ${isWinner ? roleStyle.border + ' bg-gradient-to-br from-white to-amber-50/30' : 'border-slate-100 bg-slate-50'} hover:shadow-xl transition-all group relative overflow-hidden`}>
                                                    {/* Winner Glow Effect */}
                                                    {isWinner && (
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-200/30 to-transparent rounded-bl-[4rem]" />
                                                    )}

                                                    <div className="flex items-start justify-between mb-3 relative z-10">
                                                        {/* Role Badge */}
                                                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wide ${roleStyle.bg} ${roleStyle.text} shadow-sm`}>
                                                            {roleStyle.label}
                                                        </span>
                                                        {/* Event Type Badge */}
                                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${typeStyle.bg} ${typeStyle.text}`}>
                                                            {typeStyle.icon} {eventType}
                                                        </span>
                                                    </div>

                                                    <h3 className={`text-sm font-black uppercase leading-snug mb-2 ${isWinner ? 'text-amber-900' : 'text-slate-800'} group-hover:text-blue-600 transition-colors`}>
                                                        {cert.eventName || cert.event || 'TechSpark Event'}
                                                    </h3>

                                                    <div className="flex items-center gap-3 mb-4">
                                                        <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {cert.eventDate || cert.date || 'N/A'}
                                                        </p>
                                                        <span className="text-[8px] font-black text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">
                                                            {cert.certificateId || cert.certID || 'ID:N/A'}
                                                        </span>
                                                    </div>

                                                    {(cert.certificateUrl || cert.link) && (
                                                        <div className="flex gap-2">
                                                            <a
                                                                href={cert.certificateUrl || cert.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`flex-1 py-3 ${isWinner ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-amber-400' : 'bg-white border-slate-200 text-slate-600'} border rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-[1.02] hover:shadow-lg transition-all flex items-center justify-center gap-2`}
                                                            >
                                                                <Download className="w-3.5 h-3.5" /> Download
                                                            </a>
                                                            <button
                                                                onClick={() => {
                                                                    const certId = cert.certificateId || cert.certID || '';
                                                                    const eventName = cert.eventName || 'TechSpark Event';
                                                                    const eventType = cert.eventType || 'Workshop';
                                                                    const eventDate = cert.eventDate || cert.date || '';
                                                                    const roleLabel = roleStyle.label.replace(/🥇|🥈|🥉|⭐|🎖️\s?/g, '').trim();
                                                                    const verifyUrl = `https://techspark-rit.vercel.app/certificateverify?query=${certId}`;

                                                                    // Build enhanced post text
                                                                    let shareText = `🎉 Excited to announce that I have successfully completed the "${eventName}"!\n\n`;
                                                                    shareText += `📌 Event Type: ${eventType}\n`;
                                                                    if (eventDate) shareText += `📅 Date: ${eventDate}\n`;
                                                                    shareText += `🏅 Achievement: ${isWinner ? '🏆 ' : ''}${roleLabel}\n`;
                                                                    shareText += `🆔 Certificate ID: ${certId}\n\n`;
                                                                    shareText += `This ${eventType.toLowerCase()} was organized by @TechSpark Club - RIT, RIT's Premier Technical Club, fostering innovation and technical excellence.\n\n`;
                                                                    shareText += `✅ Verify my certificate:\n${verifyUrl}\n\n`;
                                                                    shareText += `Thank you @TechSpark Club - RIT for this amazing opportunity! 🙏\n\n`;
                                                                    shareText += `#TechSpark #RIT #${eventType.replace(/\s+/g, '')} #Certificate #TechCommunity #Learning #Achievement #Certification`;

                                                                    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`;

                                                                    // Show Pro Tip alert
                                                                    alert('📢 Pro Tip: After LinkedIn opens, type @TechSpark in your post to tag our official page! 🏷️');

                                                                    // Open LinkedIn
                                                                    window.open(linkedInUrl, '_blank');
                                                                }}
                                                                className="px-4 py-3 bg-[#0077B5] text-white border border-[#0077B5] rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-[#005885] hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                                title="Share on LinkedIn"
                                                            >
                                                                <Linkedin className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center space-y-3">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                                            <Award className="w-6 h-6 text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No certificates found in vault</p>
                                        <p className="text-slate-300 text-[9px] italic">Participate in events to earn certifications!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                Academic Profile
                            </h2>
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-600">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student Name</p>
                                        <p className="text-sm font-bold text-slate-700 uppercase">{user.fullName || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Reg Number</p>
                                        <p className="text-sm font-bold text-slate-700">{user.rollNumber || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Department</p>
                                        <p className="text-sm font-bold text-slate-700">{user.department || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Year</p>
                                        <p className="text-sm font-bold text-blue-600">Year {user.yearOfStudy || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Admission Batch</p>
                                        <p className="text-sm font-bold text-slate-700">{user.admissionYear || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                        <p className="text-xs font-bold text-slate-700 truncate">{user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
                                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                        <p className="text-xs font-bold text-slate-700">+91 {user.phone || 'XXXXXXXXXX'}</p>
                                    </div>
                                    <div className="mt-4 p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-3 group hover:border-blue-400 transition-all">
                                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
                                            <QRCodeSVG value={user.rollNumber || "TECHSPARK-GUEST"} size={120} level={"H"} includeMargin={false} imageSettings={{ src: tsLogo, x: undefined, y: undefined, height: 24, width: 24, excavate: true }} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Digital Entry QR</p>
                                            <p className="text-[9px] text-blue-600 font-medium font-mono">{user.rollNumber || 'NO-REG-DATA'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="digital-id-card" className="pt-6 border-t border-slate-100">
                                <button onClick={handleDownloadCard} className="w-full bg-blue-600 text-white p-6 rounded-2xl relative overflow-hidden group cursor-pointer text-left focus:outline-none shadow-lg shadow-blue-100">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
                                    <h3 className="text-lg font-bold mb-1">TS Digital Identity</h3>
                                    <p className="text-blue-100 text-xs mb-4 uppercase font-bold tracking-tight">Your official club member badge.</p>
                                    <div className="flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm group-hover:bg-white group-hover:text-blue-600 transition-all uppercase">
                                        DOWNLOAD CARD <Download className="w-3 h-3" />
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-blue-600" />
                                    Spark Badges
                                </h2>
                                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    {calculatedPoints} XP
                                </div>
                            </div>
                            <div className="space-y-4">
                                {certsLoading ? (
                                    <div className="py-8 flex flex-col items-center gap-3">
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Synchronizing Achievement Data...</p>
                                    </div>
                                ) : (
                                    badgeMap.map((badge) => (
                                        <motion.div key={badge.id} whileHover={{ x: 4 }} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${badge.unlocked ? 'bg-slate-50 border-slate-100' : 'bg-white border-dashed border-slate-200 opacity-40 grayscale group'}`}>
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${badge.color} text-white shadow-lg ${badge.unlocked ? badge.glow : ''}`}>
                                                {badge.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-1.5">
                                                    <h3 className="text-sm font-bold text-slate-800 uppercase truncate">{badge.name}</h3>
                                                    {!badge.unlocked && <Lock className="w-3 h-3 text-slate-400" />}
                                                    {badge.unlocked && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium leading-tight">{badge.unlocked ? badge.description : `Unlock: ${badge.description}`}</p>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-4">Points Progress</p>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((calculatedPoints / 10000) * 100, 100)}%` }} className="h-full bg-gradient-to-r from-blue-600 to-indigo-600" />
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                    <span>{calculatedPoints} XP</span>
                                    <span>10000 XP Goal</span>
                                </div>
                            </div>
                        </div>
                    </div >
                </div >

                {/* HIDDEN ID CARD TEMPLATE */}
                <div className="fixed -left-[2000px] top-0 pointer-events-none">
                    <div ref={idCardRef} className="w-[400px] h-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col relative" style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                        <div className="h-40 bg-gradient-to-br from-blue-700 to-indigo-900 p-6 flex flex-col justify-between items-center relative overflow-hidden text-center">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                            <div className="relative z-10 flex items-center justify-between w-full bg-white px-4 py-3 rounded-xl shadow-md border border-white/50">
                                <img src={ritLogo} alt="RIT" className="h-6 w-auto" />
                                <div className="w-px h-6 bg-slate-200 mx-2" />
                                <img src={tsLogo} alt="TechSpark" className="h-6 w-auto" />
                            </div>
                            <h2 className="relative z-10 text-white text-xs font-bold tracking-[0.2em] uppercase mt-4">OFFICIAL MEMBER IDENTITY</h2>
                        </div>
                        <div className="flex flex-col items-center -mt-14 relative z-20">
                            <div className="w-28 h-28 bg-white p-1 rounded-2xl shadow-xl">
                                <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-3xl overflow-hidden border border-slate-50 uppercase">
                                    {user.fullName?.charAt(0)}
                                </div>
                            </div>
                            <h1 className="text-xl font-extrabold text-slate-800 mt-4 uppercase">{user.fullName}</h1>
                            <p className="text-blue-600 text-[10px] font-bold tracking-widest uppercase">TECHSPARK CLUB MEMBER</p>
                        </div>
                        <div className="flex-1 p-8 pt-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Register Number</p>
                                    <p className="text-sm text-slate-700 font-bold flex items-center gap-1.5"><Hash className="w-3 h-3 text-blue-600" /> {user.rollNumber}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Admission Year</p>
                                    <p className="text-sm text-slate-700 font-bold flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-600" /> {user.admissionYear}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Department</p>
                                    <p className="text-sm text-slate-700 font-bold flex items-center gap-1.5 uppercase"><Building2 className="w-3 h-3 text-blue-600" /> {user.department}</p>
                                </div>
                                <div className="space-y-1 text-left">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Section</p>
                                    <p className="text-sm text-slate-700 font-bold flex items-center gap-1.5 uppercase"><CheckCircle className="w-3 h-3 text-blue-600" /> {user.section}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="space-y-1 text-left">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Verification ID</p>
                                    <p className="text-[11px] text-slate-900 font-mono">TS-IDENTITY-{user.rollNumber?.slice(-4)}</p>
                                </div>
                                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center p-1 opacity-60">
                                    <QrCode className="w-full h-full text-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                                <Zap className="w-2.5 h-2.5 text-blue-600" /> IGNITING INNOVATION @ RIT CHENNAI
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feedback Modal */}
                <AnimatePresence>
                    {showFeedbackModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowFeedbackModal(false)}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                {/* Header */}
                                <div className="p-8 bg-blue-600 text-white text-left relative shrink-0">
                                    <button
                                        onClick={() => setShowFeedbackModal(false)}
                                        className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                        <Rocket className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tight">Mission Feedback</h3>
                                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Refining future operations: {activeFeedbackEvent?.title}</p>
                                </div>

                                <div className="p-8 space-y-8 text-left overflow-y-auto custom-scrollbar">
                                    {/* Info Notice */}
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black text-amber-900 uppercase italic leading-tight">Certificate Requirement</p>
                                            <p className="text-[10px] text-amber-700 font-bold mt-1 uppercase leading-relaxed">
                                                Please complete this feedback form to unlock your event certificate. Every field is mandatory for mission debriefing.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 1. Overall Event Rating */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1️⃣ Overall Event Rating</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setFeedbackData({ ...feedbackData, overallRating: val })}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${feedbackData.overallRating >= val
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                                                        : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <Zap className={`w-5 h-5 ${feedbackData.overallRating >= val ? 'fill-current' : ''}`} />
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase italic text-center">
                                            {['Very Poor', 'Poor', 'Fair', 'Excellent', 'Absolute Brilliance!'][feedbackData.overallRating - 1]}
                                        </p>
                                    </div>

                                    {/* Reusable Linear Scale Renderer */}
                                    {[
                                        { id: 'contentQuality', num: '2️⃣', label: 'Session / Content Quality' },
                                        { id: 'speakerPerformance', num: '3️⃣', label: 'Speaker / Resource Person Performance' },
                                        { id: 'relevance', num: '4️⃣', label: 'Relevance to Learning / Career' },
                                        { id: 'timeManagement', num: '5️⃣', label: 'Time Management of the Event' },
                                        { id: 'engagement', num: '6️⃣', label: 'Interaction & Engagement Level' },
                                        { id: 'coordination', num: '7️⃣', label: 'Overall Coordination by TechSpark Team' }
                                    ].map((field) => (
                                        <div key={field.id} className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.num} {field.label}</label>
                                            <div className="flex items-center justify-between gap-2 px-2">
                                                {[1, 2, 3, 4, 5].map((val) => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setFeedbackData({ ...feedbackData, [field.id]: val })}
                                                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border ${feedbackData[field.id] === val
                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex justify-between px-2 text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                                                <span>POOR/LOW</span>
                                                <span>EXCELLENT/HIGH</span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* 8. What did you like most? */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">8️⃣ What did you like most about the event?</label>
                                        <textarea
                                            value={feedbackData.likedMost}
                                            onChange={(e) => setFeedbackData({ ...feedbackData, likedMost: e.target.value })}
                                            placeholder="Highlight the strongest points of this mission..."
                                            className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-slate-800 text-sm focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                                        />
                                    </div>

                                    {/* 9. Improvements */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">9️⃣ What can be improved in future events?</label>
                                        <textarea
                                            value={feedbackData.improvements}
                                            onChange={(e) => setFeedbackData({ ...feedbackData, improvements: e.target.value })}
                                            placeholder="How can we optimize the next deployment?"
                                            className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-slate-800 text-sm focus:ring-4 focus:ring-blue-500/5 transition-all resize-none"
                                        />
                                    </div>

                                    {/* 10. Recommend */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">🔟 Would you recommend TechSpark Club events to others?</label>
                                        <div className="flex gap-2">
                                            {['Yes', 'Maybe', 'No'].map((opt) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setFeedbackData({ ...feedbackData, recommend: opt })}
                                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${feedbackData.recommend === opt
                                                        ? opt === 'Yes' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' :
                                                            opt === 'Maybe' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' :
                                                                'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100'
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 sticky bottom-0 bg-white/80 backdrop-blur-sm -mx-8 px-8 pb-4">
                                        <button
                                            onClick={handleFeedbackSubmit}
                                            disabled={submittingFeedback}
                                            className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {submittingFeedback ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" /> DISPATCHING...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" /> TRANSMIT & UNLOCK CERTIFICATE
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Registration Intelligence Modal */}
                <AnimatePresence>
                    {selectedRegDetails && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedRegDetails(null)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
                            >
                                {/* Header */}
                                <div className="p-8 bg-slate-900 text-white text-left relative shrink-0">
                                    <button
                                        onClick={() => setSelectedRegDetails(null)}
                                        className="absolute top-6 right-6 p-3 hover:bg-white/10 rounded-2xl transition-all group"
                                    >
                                        <X className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                    </button>
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
                                            <ShieldCheck className="w-8 h-8 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase italic tracking-tight">Mission Intelligence</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em]">{selectedRegDetails.status === 'Upcoming' ? 'ACTIVE RESERVATION' : 'LOGGED ENTRY'}</span>
                                                <div className="w-1 h-1 bg-slate-700 rounded-full" />
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {selectedRegDetails.id?.slice(-8).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                                    {/* Operational Summary */}
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1">Target Mission</p>
                                                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">{selectedRegDetails.eventTitle}</h4>
                                            </div>
                                            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                                                <Calendar className="w-4 h-4 text-blue-600" />
                                                <span className="text-xs font-black text-blue-600 uppercase italic">{selectedRegDetails.eventDate}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Scheduled Time
                                                </p>
                                                <p className="text-xs font-black text-slate-700 uppercase">{selectedRegDetails.eventTime}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" /> Tactical Venue
                                                </p>
                                                <p className="text-xs font-black text-slate-700 uppercase">{allEvents.find(e => e.id === selectedRegDetails.eventId)?.venue || 'CAMPUS HUB'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                    <Award className="w-3 h-3" /> Status Link
                                                </p>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase italic ${selectedRegDetails.isAttended || selectedRegDetails.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {selectedRegDetails.isAttended || selectedRegDetails.status === 'Present' ? 'VERIFIED' : 'UPCOMING'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Squad Infrastructure */}
                                    {selectedRegDetails.isTeamRegistration && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 ml-1">
                                                <div className="w-2 h-5 bg-blue-600 rounded-full" />
                                                <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">Squad Infrastructure Details</h5>
                                            </div>
                                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-blue-500/10">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[50px]" />
                                                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                                                            <Rocket className="w-7 h-7 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Squad Designation</p>
                                                            <h4 className="text-2xl font-black italic tracking-tighter leading-none">{selectedRegDetails.teamName}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm self-stretch md:self-auto flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Auth Code</p>
                                                            <p className="text-base font-black text-blue-400 font-mono tracking-wider leading-none mt-1">{selectedRegDetails.teamCode}</p>
                                                        </div>
                                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                                            <Lock className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Tactical Deployment (Active Agents)</p>
                                                    {isFetchingTeam ? (
                                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl">
                                                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Synchronizing squad link...</span>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {teamMembers.map((member, i) => (
                                                                <div key={i} className={`flex items-center gap-3 p-3.5 bg-white/5 border rounded-2xl transition-all ${member.userId === user.uid ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5'}`}>
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${member.teamRole === 'LEADER' ? 'bg-amber-400 text-amber-900' : 'bg-slate-700 text-slate-300'}`}>
                                                                        {member.teamRole === 'LEADER' ? <Crown className="w-4 h-4" /> : i + 1}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-[11px] font-black text-white truncate uppercase">{member.studentName}</p>
                                                                            {member.userId === user.uid && <span className="text-[8px] bg-blue-600 text-white px-1 py-0.5 rounded font-black italic">YOU</span>}
                                                                        </div>
                                                                        <p className="text-[9px] text-slate-500 font-bold uppercase font-mono">{member.studentRoll}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Directive Info (Problem Statement) */}
                                    {selectedRegDetails.problemStatement && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 ml-1">
                                                <div className="w-2 h-5 bg-emerald-600 rounded-full" />
                                                <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">Mission Objective (Problem Statement)</h5>
                                            </div>
                                            <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] relative group cursor-help">
                                                <div className="absolute top-4 right-4 text-emerald-600 opacity-20 group-hover:opacity-40 transition-opacity">
                                                    <Brain className="w-12 h-12" />
                                                </div>
                                                <p className="text-xs font-bold text-emerald-900 leading-relaxed italic uppercase">
                                                    "{selectedRegDetails.problemStatement}"
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Metadata Logistics */}
                                    <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                                        <div className="text-left">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Authorization Logged</p>
                                            <p className="text-xs font-black text-slate-700">
                                                {selectedRegDetails.registeredAt?.toDate ? selectedRegDetails.registeredAt.toDate().toLocaleString() : 'SYSTEM VERIFIED'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Operational Core</p>
                                            <p className="text-xs font-black text-blue-600 uppercase italic">TS-RIT-{user.department}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                                    <button
                                        onClick={() => setSelectedRegDetails(null)}
                                        className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3"
                                    >
                                        DISMISS DOSSIER <ShieldCheck className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Quiz Modal - Embedded Google Form */}
                <AnimatePresence>
                    {showQuizModal && activeQuizUrl && (
                        <div id="quiz-proctored-container" className="fixed inset-0 bg-slate-900 z-[99999] flex flex-col" style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}>

                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-3 md:px-5 py-2 md:py-2.5 flex items-center justify-between shadow-lg border-b border-purple-500/30">
                                <div className="flex items-center gap-3 md:gap-5">
                                    <img src={tsLogo} alt="TechSpark" className="h-10 md:h-14 w-auto object-contain shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
                                    <div className="w-px h-8 bg-white/20 hidden md:block" />
                                    <div className="min-w-0">
                                        <h3 className="text-sm md:text-xl font-black text-white uppercase tracking-tight truncate">{activeQuizTitle}</h3>
                                    </div>
                                </div>

                                {/* Live Clock */}
                                <div className="hidden lg:flex items-center gap-3 bg-black/20 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                                    <Clock className="w-4 h-4 text-purple-200 animate-pulse" />
                                    <span className="text-white font-mono font-black text-lg tracking-wider">
                                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                    </span>
                                </div>

                                {/* Proctor Status Indicator */}
                                <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all ${tabSwitchCount === 0 ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' :
                                    tabSwitchCount < MAX_VIOLATIONS ? 'bg-amber-500/20 border-amber-400/30 text-amber-300 animate-pulse' :
                                        'bg-red-500/20 border-red-400/30 text-red-300'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full ${tabSwitchCount === 0 ? 'bg-emerald-400' :
                                        tabSwitchCount < MAX_VIOLATIONS ? 'bg-amber-400 animate-ping' : 'bg-red-400'
                                        }`} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">
                                        {tabSwitchCount === 0 ? 'PROCTORED' : `⚠ ${tabSwitchCount}/${MAX_VIOLATIONS}`}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 md:gap-3">
                                    {/* Mobile Clock */}
                                    <div className="lg:hidden bg-black/20 px-2 py-1 rounded-lg border border-white/10">
                                        <span className="text-white font-mono font-bold text-[10px]">
                                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </span>
                                    </div>

                                    {/* Smart Finish Button */}
                                    {showFinishButton && (
                                        <motion.button
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleQuizCompletion}
                                            className="px-4 md:px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg md:rounded-xl font-black text-[10px] md:text-xs uppercase tracking-[0.15em] transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30 border border-emerald-400 group"
                                        >
                                            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                            VERIFY & FINISH
                                        </motion.button>
                                    )}
                                </div>
                            </div>

                            {/* Proctor Warning Overlay */}
                            <AnimatePresence>
                                {proctorWarning && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -50 }}
                                        className="absolute top-20 left-1/2 -translate-x-1/2 z-[100001] px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl shadow-2xl shadow-red-500/50 border border-red-400"
                                    >
                                        <p className="text-white font-black text-sm md:text-base uppercase tracking-wide text-center">
                                            {proctorWarning}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>



                            {/* Quiz Iframe */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 w-full bg-white overflow-hidden relative z-[10] pointer-events-auto"
                            >
                                <iframe
                                    src={activeQuizUrl}
                                    onLoad={handleIframeLoad}
                                    title="TechSpark Quiz"
                                    className="w-full h-full border-0 relative z-[11] pointer-events-auto"
                                    style={{ minHeight: 'calc(100vh - 120px)' }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />

                                {/* Watermark Overlay - Screenshot Deterrent */}
                                <div className="absolute inset-0 z-[12] pointer-events-none overflow-hidden select-none" style={{ userSelect: 'none' }}>
                                    {/* Diagonal Watermarks Pattern */}
                                    <div className="absolute inset-0 flex flex-wrap gap-20 rotate-[-25deg] scale-150 origin-center opacity-[0.04]">
                                        {[...Array(30)].map((_, i) => (
                                            <div key={i} className="whitespace-nowrap text-slate-900 font-black text-lg uppercase tracking-widest">
                                                {user?.fullName || 'Student'} • {user?.rollNumber || 'ID'} • {new Date().toLocaleDateString()}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Corner Watermarks */}
                                    <div className="absolute top-2 left-2 px-3 py-1.5 bg-black/5 rounded-lg backdrop-blur-sm">
                                        <p className="text-[8px] text-black/20 font-bold uppercase tracking-widest">
                                            {user?.fullName} | {user?.rollNumber}
                                        </p>
                                    </div>
                                    <div className="absolute top-2 right-2 px-3 py-1.5 bg-black/5 rounded-lg backdrop-blur-sm">
                                        <p className="text-[8px] text-black/20 font-bold uppercase tracking-widest">
                                            {currentTime.toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className="absolute bottom-16 left-2 px-3 py-1.5 bg-black/5 rounded-lg backdrop-blur-sm">
                                        <p className="text-[8px] text-black/20 font-bold uppercase tracking-widest">
                                            PROCTORED | {user?.department}
                                        </p>
                                    </div>
                                    <div className="absolute bottom-16 right-2 px-3 py-1.5 bg-black/5 rounded-lg backdrop-blur-sm">
                                        <p className="text-[8px] text-black/20 font-bold uppercase tracking-widest">
                                            {user?.fullName} | {new Date().toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Center Watermark */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg]">
                                        <p className="text-4xl md:text-6xl font-black text-black/[0.03] uppercase tracking-widest whitespace-nowrap">
                                            {user?.rollNumber || 'PROCTORED'}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Footer */}
                            <div className="bg-slate-900 px-3 md:px-6 py-2 md:py-3 text-center shrink-0">
                                <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider md:tracking-widest">
                                    🔒 Proctored Quiz • 🚫 Tab Switch = Violation • ⌨️ Activity Monitored • ⏱️ Submit on time
                                </p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Quiz Rules Modal */}
                {
                    showQuizRulesModal && pendingQuizData && createPortal(
                        <AnimatePresence>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: -20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: -20 }}
                                    className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden flex flex-col"
                                >
                                    {/* Header - Compact */}
                                    <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 text-white text-center shrink-0">
                                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-lg font-black uppercase tracking-wide">⚠️ Proctored Quiz</h2>
                                        <p className="text-xs text-white/80 mt-1 font-medium">{pendingQuizData.title}</p>
                                    </div>

                                    {/* Rules List - Scrollable */}
                                    <div className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[50vh]">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mb-2">
                                            📋 Read Carefully Before Starting
                                        </p>

                                        {/* Rule Items - Compact */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                                <div className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center shrink-0 text-sm">🚫</div>
                                                <div>
                                                    <p className="text-xs font-black text-red-700 uppercase">No Tab Switching / Alt+Tab</p>
                                                    <p className="text-[10px] text-red-600">3 violations = Quiz Terminated</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0 text-sm">👁️</div>
                                                <div>
                                                    <p className="text-xs font-black text-amber-700 uppercase">Activity Monitored</p>
                                                    <p className="text-[10px] text-amber-600">Session and visibility are logged</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center shrink-0 text-sm">✅</div>
                                            <div>
                                                <p className="text-xs font-black text-blue-700 uppercase">How to Complete</p>
                                                <p className="text-[10px] text-blue-600">Submit form → Click "VERIFY & FINISH"</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 p-3 bg-slate-900 rounded-xl text-center">
                                        <p className="text-[9px] text-white font-bold uppercase tracking-widest">
                                            ⚠️ By clicking "Start Quiz", you agree to be monitored
                                        </p>
                                    </div>

                                    {/* Action Buttons - Compact */}
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                                        <button
                                            onClick={() => {
                                                // Exit fullscreen if active
                                                if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
                                                    if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
                                                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => { });
                                                    else if (document.msExitFullscreen) document.msExitFullscreen().catch(() => { });
                                                }
                                                setShowQuizRulesModal(false);
                                                setPendingQuizData(null);
                                            }}
                                            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                        >
                                            ← Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Request fullscreen on the whole document
                                                const elem = document.documentElement;
                                                if (elem.requestFullscreen) {
                                                    elem.requestFullscreen();
                                                } else if (elem.webkitRequestFullscreen) {
                                                    elem.webkitRequestFullscreen();
                                                } else if (elem.msRequestFullscreen) {
                                                    elem.msRequestFullscreen();
                                                }

                                                // Save quiz state to session storage for reload detection
                                                sessionStorage.setItem('techspark_quiz_active', JSON.stringify({
                                                    url: pendingQuizData.url,
                                                    title: pendingQuizData.title,
                                                    regId: pendingQuizData.regId,
                                                    violations: 0,
                                                    startTime: Date.now()
                                                }));

                                                setActiveQuizUrl(pendingQuizData.url);
                                                setActiveQuizTitle(pendingQuizData.title);
                                                setActiveQuizRegId(pendingQuizData.regId);
                                                setIframeLoadCount(0);
                                                setShowFinishButton(false);
                                                setTabSwitchCount(0);
                                                setProctorWarning('');
                                                quizStartTime.current = null;
                                                isQuizFinishing.current = false;
                                                setShowQuizModal(true);
                                                setShowQuizRulesModal(false);
                                                setPendingQuizData(null);
                                            }}
                                            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Rocket className="w-3 h-3" /> Start Quiz
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>,
                        document.body
                    )
                }
            </div >
        </div >
    );
};

export default StudentDashboard;
