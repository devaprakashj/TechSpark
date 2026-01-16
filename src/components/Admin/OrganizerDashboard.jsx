import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    LogOut,
    Plus,
    X,
    CheckCircle,
    LayoutDashboard,
    TrendingUp,
    Users,
    Clock,
    MapPin,
    Download,
    FileText,
    Shield,
    UserMinus,
    ChevronRight,
    ChevronLeft,
    Upload,
    Globe,
    Building2,
    Info,
    Settings,
    Eye,
    Save,
    Send,
    Briefcase,
    UserCog,
    ShieldCheck,
    ArrowRight,
    ClipboardList,
    ArrowUpRight,
    Search,
    Briefcase as BriefcaseIcon,
    QrCode,
    Activity,
    RotateCcw,
    Zap
} from 'lucide-react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ritLogo from '../../assets/rit-logo.png';
import techsparkLogo from '../../assets/techspark-logo.png';

const OrganizerDashboard = () => {
    const [organizer, setOrganizer] = useState(null);
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        live: 0,
        rejected: 0,
        completed: 0,
        draft: 0,
        totalRegs: 0
    });
    const [loadingData, setLoadingData] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard');
    const [activeStep, setActiveStep] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [allRegs, setAllRegs] = useState([]); // All regs for all events of organizer
    const [loadingRegs, setLoadingRegs] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null); // null = create new, otherwise = editing
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedEventFeedback, setSelectedEventFeedback] = useState([]);
    const [loadingFeedback, setLoadingFeedback] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Registration Search & Filter State
    const [regSearchQuery, setRegSearchQuery] = useState('');
    const [regDeptFilter, setRegDeptFilter] = useState('all');
    const [regYearFilter, setRegYearFilter] = useState('all');

    // Custom Export System
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState('REGISTRATION'); // REGISTRATION or ATTENDANCE
    const [selectedFields, setSelectedFields] = useState([
        'name', 'roll', 'dept', 'year', 'section', 'phone', 'squad', 'role', 'problem', 'date', 'status'
    ]);

    const availableFields = [
        { id: 'name', label: 'FULL NAME', category: 'Identity' },
        { id: 'roll', label: 'ROLL NO', category: 'Identity' },
        { id: 'dept', label: 'DEPARTMENT', category: 'Academic' },
        { id: 'year', label: 'YEAR', category: 'Academic' },
        { id: 'section', label: 'SECTION', category: 'Academic' },
        { id: 'phone', label: 'MOBILE NO', category: 'Contact' },
        { id: 'squad', label: 'SQUAD/TEAM', category: 'Team' },
        { id: 'role', label: 'SQUAD ROLE', category: 'Team' },
        { id: 'problem', label: 'PROBLEM STATEMENT', category: 'Strategic' },
        { id: 'date', label: 'REG DATE', category: 'Timeline' },
        { id: 'status', label: 'ATTENDANCE', category: 'Admin' },
    ];

    const navigate = useNavigate();

    // Multi-step Form Data
    const [formData, setFormData] = useState({
        title: '',
        type: 'Workshop',
        shortDescription: '',
        detailedDescription: '',
        posterUrl: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        venueType: 'Offline',
        venueName: '',
        googleMapLink: '',
        audienceType: 'Whole College',
        departments: [],
        years: [],
        sections: [],
        registrationRequired: true,
        regStartDateTime: '',
        regEndDateTime: '',
        maxParticipants: '',
        waitingList: false,
        isTeamEvent: false,
        minTeamSize: 1,
        maxTeamSize: 4,
        problemStatements: [],
        allowOpenStatement: false,
        // Quiz specific fields
        quizFormUrl: '',
        quizEntryName: '',
        quizEntryRoll: '',
        quizEntryDept: '',
        quizEntryYear: '',
        quizEntrySection: '',
        quizEntryMobile: '',
        coordinatorName: '',
        coordinatorPhone: '',
        coordinatorEmail: '',
        displayCoordinator: true,
        terms: '',
        acceptedTerms: false,
        internalNotes: ''
    });

    const [globalDemographics, setGlobalDemographics] = useState({
        departments: ['CSE', 'IT', 'AI-DS', 'AI-ML', 'ECE', 'EEE', 'MECH', 'CIVIL'],
        years: ['I', 'II', 'III', 'IV'],
        sections: ['A', 'B', 'C', 'D']
    });

    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        phone: '',
        department: ''
    });

    const fetchInitialData = (username) => {
        if (!username) {
            console.error("Operational Error: Missing Lead Identity");
            setLoadingData(false);
            return () => { }; // Return an empty cleanup function
        }

        setLoadingData(true);
        console.log("Initializing Dashboard for Lead:", username);

        // 1. Listen to Organizer Events (Real-time)
        const eventsQuery = query(
            collection(db, 'events'),
            where('createdBy', '==', username)
        );

        let unsubscribeRegs = null;

        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });

            setEvents(eventList);
            setLoadingData(false);

            // 2. Clear old reg listener if any
            if (unsubscribeRegs) unsubscribeRegs();

            // 3. Setup Registration Listener for these events
            const allRegsQuery = query(collection(db, 'registrations'));

            unsubscribeRegs = onSnapshot(allRegsQuery, (regSnapshot) => {
                const allSystemRegs = regSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Update global demographics based on all registered students in the system
                const depts = new Set(['CSE', 'IT', 'AI-DS', 'AI-ML', 'ECE', 'EEE', 'MECH', 'CIVIL']);
                const years = new Set(['I', 'II', 'III', 'IV']);
                const sections = new Set(['A', 'B', 'C', 'D']);

                allSystemRegs.forEach(reg => {
                    if (reg.studentDept) depts.add(reg.studentDept);
                    if (reg.studentYear) years.add(reg.studentYear);
                    if (reg.studentSection) sections.add(reg.studentSection);
                });

                setGlobalDemographics({
                    departments: Array.from(depts).sort(),
                    years: Array.from(years).sort(),
                    sections: Array.from(sections).sort()
                });

                const filteredRegs = allSystemRegs.filter(reg => eventIds.includes(reg.eventId));
                setAllRegs(filteredRegs);
                console.log(`Synced ${filteredRegs.length} total registrations across ${eventList.length} missions.`);
            });
        }, (error) => {
            console.error("Operational Data Sync Error:", error);
            setLoadingData(false);
        });

        return () => {
            unsubscribeEvents();
            if (unsubscribeRegs) unsubscribeRegs();
        };
    };

    useEffect(() => {
        const token = localStorage.getItem('organizerToken');
        if (!token) {
            navigate('/organizer/login');
            return;
        }
        try {
            const org = JSON.parse(token);
            setOrganizer(org);
            setProfileData({
                fullName: org.fullName || '',
                email: org.email || '',
                phone: org.phone || '',
                department: org.department || ''
            });

            // Initialize Real-time Data Sync
            const unsubscribe = fetchInitialData(org.username);

            return () => {
                if (unsubscribe && typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            };
        } catch (e) {
            console.error("Authentication Token Corrupted:", e);
            localStorage.removeItem('organizerToken');
            navigate('/organizer/login');
        }
    }, []);

    // Real-time listener for DETAILED registrations when an event is selected
    useEffect(() => {
        if (!selectedEvent?.id) {
            setRegistrations([]);
            return;
        }

        console.log("Establishing Tactical Link for:", selectedEvent.title);
        setLoadingRegs(true);

        const q = query(
            collection(db, 'registrations'),
            where('eventId', '==', selectedEvent.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const regList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRegistrations(regList);
            setLoadingRegs(false);
            console.log(`Live Intelligence Sync: ${regList.length} agents detected.`);
        }, (error) => {
            console.error("Link Failure in Detail sync:", error);
            setLoadingRegs(false);
        });

        return () => unsubscribe();
    }, [selectedEvent?.id]);

    // Real-time listener for Quiz Submissions
    useEffect(() => {
        if (currentView !== 'submissions' || !organizer?.username) return;

        setLoadingSubmissions(true);
        console.log("Establishing Live Score Link...");

        const q = query(
            collection(db, 'quizSubmissions'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const subsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter submissions relevant to the organizer's events
            const organizerEventIds = events.map(e => e.id);
            const filteredSubs = subsList.filter(s => organizerEventIds.includes(s.eventId));
            setSubmissions(filteredSubs);
            setLoadingSubmissions(false);
            console.log(`Live Intelligence Sync: ${filteredSubs.length} submissions detected.`);
        }, (error) => {
            console.error("Link Failure in Submissions sync:", error);
            setLoadingSubmissions(false);
        });

        return () => unsubscribe();
    }, [currentView, organizer?.username, events]);

    // Reactive Stats Calculation
    useEffect(() => {
        setStats({
            total: events.length,
            pending: events.filter(e => e.status === 'PENDING').length,
            live: events.filter(e => e.status === 'LIVE').length,
            rejected: events.filter(e => e.status === 'REJECTED').length,
            draft: events.filter(e => e.status === 'DRAFT').length,
            completed: events.filter(e => e.status === 'COMPLETED').length,
            totalRegs: allRegs.length
        });

        // Sync selectedEvent with the updated list to reflect real-time attendee counts etc.
        if (selectedEvent) {
            const updated = events.find(e => e.id === selectedEvent.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedEvent)) {
                setSelectedEvent(updated);
            }
        }
    }, [events, allRegs, selectedEvent]);

    const fetchEvents = async () => {
        if (organizer) fetchInitialData(organizer.username);
    };

    const handleLogout = () => {
        localStorage.removeItem('organizerToken');
        navigate('/organizer/login');
    };

    const handleCreateEvent = async (status = 'PENDING') => {
        if (status === 'PENDING' && !formData.acceptedTerms) {
            alert("Please accept the terms and conditions.");
            return;
        }

        setIsSubmitting(true);
        try {
            const eventData = {
                ...formData,
                status: status,
                remarks: editingEventId ? formData.remarks : '',
                updatedAt: serverTimestamp(),
                createdBy: organizer.username,
                // Map legacy fields for compatibility
                date: `${formData.startDate} | ${formData.startTime}`,
                venue: formData.venueName,
                description: formData.shortDescription
            };

            if (editingEventId) {
                // Update existing event
                await updateDoc(doc(db, 'events', editingEventId), eventData);
                alert(status === 'DRAFT' ? "Event updated and saved as draft. 📝" : "Event updated and resubmitted for approval. 🚀");
            } else {
                // Create new event
                eventData.attendeesCount = 0;
                eventData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'events'), eventData);
                alert(status === 'DRAFT' ? "Event saved as draft. 📝" : "Event submitted for Super Admin approval. 🚀");
            }

            // Success reset
            resetFormAndGoBack();
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Failed to save event. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetFormAndGoBack = () => {
        setCurrentView('my_events');
        setActiveStep(1);
        setEditingEventId(null);
        setFormData({
            title: '', type: 'Workshop', shortDescription: '', detailedDescription: '', posterUrl: '',
            startDate: '', startTime: '', endDate: '', endTime: '', venueType: 'Offline', venueName: '', googleMapLink: '',
            audienceType: 'Whole College', departments: [], years: [], sections: [],
            registrationRequired: true, regStartDateTime: '', regEndDateTime: '', maxParticipants: '', waitingList: false,
            isTeamEvent: false, minTeamSize: 1, maxTeamSize: 4, problemStatements: [], allowOpenStatement: false,
            quizFormUrl: '', quizEntryName: '', quizEntryRoll: '', quizEntryDept: '',
            quizEntryYear: '', quizEntrySection: '', quizEntryMobile: '',
            coordinatorName: '', coordinatorPhone: '', coordinatorEmail: '', displayCoordinator: true,
            terms: '', acceptedTerms: false, internalNotes: ''
        });
    };

    const handleEditEvent = (event) => {
        // Only allow editing DRAFT or REJECTED events
        if (event.status !== 'DRAFT' && event.status !== 'REJECTED') {
            alert("Only DRAFT or REJECTED events can be edited.");
            return;
        }

        // Populate form with existing event data
        setFormData({
            title: event.title || '',
            type: event.type || 'Workshop',
            shortDescription: event.shortDescription || event.description || '',
            detailedDescription: event.detailedDescription || '',
            posterUrl: event.posterUrl || '',
            startDate: event.startDate || '',
            startTime: event.startTime || '',
            endDate: event.endDate || '',
            endTime: event.endTime || '',
            venueType: event.venueType || 'Offline',
            venueName: event.venueName || event.venue || '',
            googleMapLink: event.googleMapLink || '',
            audienceType: event.audienceType || 'Whole College',
            departments: event.departments || [],
            years: event.years || [],
            sections: event.sections || [],
            registrationRequired: event.registrationRequired !== false,
            regStartDateTime: event.regStartDateTime || '',
            regEndDateTime: event.regEndDateTime || '',
            maxParticipants: event.maxParticipants || '',
            waitingList: event.waitingList || false,
            isTeamEvent: event.isTeamEvent || false,
            minTeamSize: event.minTeamSize || 1,
            maxTeamSize: event.maxTeamSize || 4,
            coordinatorName: event.coordinatorName || '',
            coordinatorPhone: event.coordinatorPhone || '',
            coordinatorEmail: event.coordinatorEmail || '',
            displayCoordinator: event.displayCoordinator !== false,
            terms: event.terms || '',
            acceptedTerms: false, // Reset for re-acceptance
            internalNotes: event.internalNotes || '',
            remarks: event.remarks || '',
            // Quiz fields
            quizFormUrl: event.quizFormUrl || '',
            quizEntryName: event.quizEntryName || '',
            quizEntryRoll: event.quizEntryRoll || '',
            quizEntryDept: event.quizEntryDept || '',
            quizEntryYear: event.quizEntryYear || '',
            quizEntrySection: event.quizEntrySection || '',
            quizEntryMobile: event.quizEntryMobile || ''
        });

        setEditingEventId(event.id);
        setActiveStep(1);
        setCurrentView('create');
    };


    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Are you sure you want to delete this operation? This action is irreversible.")) return;
        try {
            await deleteDoc(doc(db, 'events', id));
            fetchEvents();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    // Quick Action: Close Registration (keep event LIVE but stop new registrations)
    const handleCloseRegistration = async (eventId) => {
        if (!window.confirm("Close registrations for this event? New participants won't be able to register.")) return;
        try {
            await updateDoc(doc(db, 'events', eventId), {
                registrationOpen: false,
                registrationClosedAt: serverTimestamp()
            });
            fetchEvents();
            alert("✅ Registrations closed successfully!");
        } catch (error) {
            console.error("Error closing registration:", error);
            alert("Failed to close registrations.");
        }
    };

    // Quick Action: Reopen Registration
    const handleReopenRegistration = async (eventId) => {
        if (!window.confirm("Reopen registrations for this event?")) return;
        try {
            await updateDoc(doc(db, 'events', eventId), {
                registrationOpen: true
            });
            fetchEvents();
            alert("✅ Registrations reopened!");
        } catch (error) {
            console.error("Error reopening registration:", error);
            alert("Failed to reopen registrations.");
        }
    };

    const handleViewFeedback = async (eventId) => {
        setLoadingFeedback(true);
        setShowFeedbackModal(true);
        try {
            const q = query(collection(db, 'feedback'), where('eventId', '==', eventId));
            const snapshot = await getDocs(q);
            const feedbackList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const timeA = a.submittedAt?.seconds || 0;
                    const timeB = b.submittedAt?.seconds || 0;
                    return timeB - timeA;
                });
            setSelectedEventFeedback(feedbackList);
        } catch (error) {
            console.error("Error fetching feedback:", error);
        } finally {
            setLoadingFeedback(false);
        }
    };

    const handleDownloadFeedbackPDF = async () => {
        if (!selectedEventFeedback.length) return;
        const currentEvent = events.find(e => e.id === selectedEventFeedback[0].eventId);
        if (!currentEvent) return;

        try {
            const doc = new jsPDF();
            const loadImage = (url) => new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });

            const [ritImg, tsImg] = await Promise.all([loadImage(ritLogo), loadImage(techsparkLogo)]);

            const centerX = 107.5;
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 5, 297, 'F');
            doc.setFillColor(255, 255, 255);
            doc.rect(5, 0, 205, 60, 'F');

            if (ritImg) doc.addImage(ritImg, 'PNG', 18, 12, 42, 36);
            if (tsImg) doc.addImage(tsImg, 'PNG', 210 - 18 - 34, 12, 34, 34);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.text('TECHSPARK CLUB', centerX, 25, { align: 'center' });

            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'normal');
            doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', centerX, 31, { align: 'center' });

            doc.setTextColor(59, 130, 246);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('FEEDBACK INTELLIGENCE REPORT', centerX, 38, { align: 'center' });

            doc.setFillColor(15, 23, 42);
            doc.roundedRect(centerX - 55, 44, 110, 10, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(currentEvent.title.toUpperCase(), centerX, 50.5, { align: 'center' });

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(9);
            doc.text('PERFORMANCE DATA:', 20, 75);
            const avgRating = (selectedEventFeedback.reduce((acc, curr) => acc + curr.rating, 0) / selectedEventFeedback.length).toFixed(1);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`VOLUME: ${selectedEventFeedback.length} Responses`, 20, 83);
            doc.text(`AVG RATING: ${avgRating} / 5.0`, 20, 88);

            const tableData = selectedEventFeedback.map((item, index) => [
                index + 1,
                item.studentName.toUpperCase(),
                item.studentRoll,
                item.rating,
                item.category.toUpperCase(),
                item.comment || 'N/A'
            ]);

            autoTable(doc, {
                startY: 100,
                head: [['#', 'STUDENT NAME', 'ROLL NO', 'RATE', 'FOCUS AREA', 'COMMENT/DEBRIEF']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
                bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
                columnStyles: {
                    5: { cellWidth: 70 }
                },
                margin: { left: 15, right: 15 }
            });

            doc.save(`${currentEvent.title.replace(/\s+/g, '_')}_Feedback_Report.pdf`);
        } catch (error) {
            console.error("PDF Error:", error);
            alert("Failed to generate PDF.");
        }
    };

    // Quick Action: Mark Event as Completed
    const handleMarkComplete = async (eventId) => {
        if (!window.confirm("Mark this event as completed? This indicates the event has concluded.")) return;
        try {
            await updateDoc(doc(db, 'events', eventId), {
                status: 'COMPLETED',
                completedAt: serverTimestamp(),
                registrationOpen: false
            });
            fetchEvents();
            alert("✅ Event marked as completed!");
        } catch (error) {
            console.error("Error marking complete:", error);
            alert("Failed to mark event as completed.");
        }
    };

    const handleViewDetails = (event) => {
        setSelectedEvent(event);
        // Reset filters when viewing new event
        setRegSearchQuery('');
        setRegDeptFilter('all');
        setRegYearFilter('all');
    };

    // Delete a registration (remove participant from event)
    const handleDeleteRegistration = async (regId, eventId) => {
        if (!window.confirm("Remove this participant from the event? This action cannot be undone.")) return;

        try {
            // Delete registration document
            await deleteDoc(doc(db, 'registrations', regId));

            // Decrement attendee count on the event
            await updateDoc(doc(db, 'events', eventId), {
                attendeesCount: increment(-1)
            });

            // Update local state
            setRegistrations(prev => prev.filter(r => r.id !== regId));

            // Also update selectedEvent if viewing details
            if (selectedEvent && selectedEvent.id === eventId) {
                setSelectedEvent(prev => ({
                    ...prev,
                    attendeesCount: Math.max(0, (prev.attendeesCount || 1) - 1)
                }));
            }

            alert("✅ Participant removed successfully!");
        } catch (error) {
            console.error("Error removing participant:", error);
            alert("Failed to remove participant.");
        }
    };

    // Undo Check-in (Keep registration but mark as not attended)
    const handleUndoCheckIn = async (regId) => {
        if (!window.confirm("Revert check-in for this participant? They will be marked as 'Registered' again.")) return;

        try {
            await updateDoc(doc(db, 'registrations', regId), {
                status: 'Registered',
                isAttended: false,
                checkedInAt: null
            });

            // Update local state
            setRegistrations(prev => prev.map(r =>
                r.id === regId ? { ...r, status: 'Registered', isAttended: false, checkedInAt: null } : r
            ));

            alert("✅ Check-in reverted successfully!");
        } catch (error) {
            console.error("Error reverting check-in:", error);
            alert("Failed to revert check-in.");
        }
    };

    // Get filtered registrations based on search and filters
    const getFilteredRegistrations = () => {
        return registrations.filter(reg => {
            // Search filter
            const searchMatch = regSearchQuery === '' ||
                reg.studentName?.toLowerCase().includes(regSearchQuery.toLowerCase()) ||
                reg.studentRoll?.toLowerCase().includes(regSearchQuery.toLowerCase());

            // Department filter - handling potential case differences
            const deptMatch = regDeptFilter === 'all' ||
                reg.studentDept?.toString().toLowerCase() === regDeptFilter?.toString().toLowerCase();

            // Year filter - handling string vs number comparison
            const yearMatch = regYearFilter === 'all' ||
                reg.studentYear?.toString() === regYearFilter?.toString();

            return searchMatch && deptMatch && yearMatch;
        });
    };

    // Get unique departments and years from registrations for filter options
    const getUniqueValues = (key) => {
        const values = new Set(registrations.map(r => r[key]?.toString()).filter(Boolean));
        return Array.from(values).sort();
    };

    const handleDownloadSubReport = async (event, type) => {
        if (!event) return;
        console.log(`SUB-EXTRACTION: ${type} FOR MISSION: ${event.title}`);
        const eventRegs = registrations.filter(r => r.eventId === event.id);

        if (!eventRegs.length) {
            alert("Strategic extraction aborted: No participant data found.");
            return;
        }

        let title = '';
        let tableHead = [];
        let tableData = [];
        let filenameSuffix = '';
        let summaryMetrics = [];

        // Helper for breakdowns
        const getBreakdown = (data) => {
            const depts = {}, years = {}, sections = {};
            data.forEach(r => {
                depts[r.studentDept] = (depts[r.studentDept] || 0) + 1;
                years[r.studentYear] = (years[r.studentYear] || 0) + 1;
                sections[r.studentSection] = (sections[r.studentSection] || 0) + 1;
            });
            return { depts, years, sections };
        };

        if (type === 'REGISTRATION') {
            title = 'EVENT REGISTRATION DIRECTORY';
            const b = getBreakdown(eventRegs);
            const squadCount = new Set(eventRegs.filter(r => r.isTeamRegistration).map(r => r.teamCode)).size;

            // Deep Analysis
            const topDept = Object.entries(b.depts).sort((a, b) => b[1] - a[1])[0];
            const topYear = Object.entries(b.years).sort((a, b) => b[1] - a[1])[0];
            const teamMembers = eventRegs.filter(r => r.isTeamRegistration).length;

            summaryMetrics = [
                ['TOTAL REGISTERED', eventRegs.length.toString()],
                ['DIVERSITY INDEX', `${Object.keys(b.depts).length} DEPTS | ${Object.keys(b.years).length} YEARS`],
                ['SQUAD INFRASTRUCTURE', `${squadCount} SQUADS | ${teamMembers} MEMBERS`],
                ['INDIVIDUAL AGENTS', (eventRegs.length - teamMembers).toString()],
                ['STRATEGIC HOTSPOT (DEPT)', `${topDept?.[0] || 'N/A'} (${topDept?.[1] || 0} REGS)`],
                ['STRATEGIC HOTSPOT (YEAR)', `${topYear?.[0] || 'N/A'} YEAR (${topYear?.[1] || 0} REGS)`],
                ['CAPACITY LOAD', `${((eventRegs.length / (event.maxParticipants || 1)) * 100).toFixed(1)}%`]
            ];
            filenameSuffix = 'Registration_Log';
        } else if (type === 'ATTENDANCE') {
            title = 'VERIFIED ATTENDANCE AUDIT';
            const attended = eventRegs.filter(r => r.isAttended || r.status === 'Present');
            const b = getBreakdown(attended);

            // Deep Analysis
            const attendanceRate = ((attended.length / eventRegs.length) * 100).toFixed(1);
            const topAttendedDept = Object.entries(b.depts).sort((a, b) => b[1] - a[1])[0];
            const topAttendedYear = Object.entries(b.years).sort((a, b) => b[1] - a[1])[0];
            const teamAttendance = attended.filter(r => r.isTeamRegistration).length;
            const individualAttendance = attended.length - teamAttendance;

            summaryMetrics = [
                ['CONFIRMED ATTENDEES', attended.length.toString()],
                ['ATTENDANCE EFFICIENCY', `${attendanceRate}% OF REGISTRATIONS`],
                ['ENGAGEMENT MIX', `${teamAttendance} TEAM | ${individualAttendance} INDIVIDUAL`],
                ['ABSENTEE COUNT', (eventRegs.length - attended.length).toString()],
                ['PEAK ENGAGEMENT (DEPT)', `${topAttendedDept?.[0] || 'N/A'} (${topAttendedDept?.[1] || 0} PRESENT)`],
                ['PEAK ENGAGEMENT (YEAR)', `${topAttendedYear?.[0] || 'N/A'} YEAR (${topAttendedYear?.[1] || 0} PRESENT)`],
                ['TACTICAL SPREAD', `${Object.keys(b.depts).length} DEPTS REPRESENTED`]
            ];
            filenameSuffix = 'Attendance_Checkin';
        }

        // Dynamic Header Generation
        const activeHeaders = ['#'];
        if (selectedFields.includes('name')) activeHeaders.push('NAME');
        if (selectedFields.includes('roll')) activeHeaders.push('ROLL');
        if (selectedFields.includes('dept')) activeHeaders.push('DEPT');
        if (selectedFields.includes('year')) activeHeaders.push('YR');
        if (selectedFields.includes('section')) activeHeaders.push('SEC');
        if (selectedFields.includes('phone')) activeHeaders.push('PHONE');
        if (selectedFields.includes('squad') && event.isTeamEvent) activeHeaders.push('SQUAD');
        if (selectedFields.includes('role') && event.isTeamEvent) activeHeaders.push('ROLE');
        if (selectedFields.includes('problem') && event.type === 'Hackathon') activeHeaders.push('PROBLEM');
        if (selectedFields.includes('date')) activeHeaders.push('DATE');
        if (selectedFields.includes('status')) activeHeaders.push('STATUS');

        tableHead = [activeHeaders];

        // Dynamic Data Generation
        tableData = eventRegs.map((r, i) => {
            const row = [i + 1];
            if (selectedFields.includes('name')) row.push((r.studentName || 'N/A').toUpperCase());
            if (selectedFields.includes('roll')) row.push(r.studentRoll || 'N/A');
            if (selectedFields.includes('dept')) row.push(r.studentDept || 'N/A');
            if (selectedFields.includes('year')) row.push(r.studentYear || 'N/A');
            if (selectedFields.includes('section')) row.push(r.studentSection || 'N/A');
            if (selectedFields.includes('phone')) row.push(r.studentPhone || 'N/A');
            if (selectedFields.includes('squad') && event.isTeamEvent) row.push(r.isTeamRegistration ? (r.teamName || 'N/A') : 'INDIVIDUAL');
            if (selectedFields.includes('role') && event.isTeamEvent) row.push(r.isTeamRegistration ? (r.teamRole || 'MEMBER') : 'N/A');
            if (selectedFields.includes('problem') && event.type === 'Hackathon') row.push(r.problemStatement || 'N/A');
            if (selectedFields.includes('date')) row.push(r.registeredAt?.toDate?.() ? new Date(r.registeredAt.toDate()).toLocaleDateString() : 'N/A');
            if (selectedFields.includes('status')) row.push((r.isAttended || r.status === 'Present') ? 'PRESENT' : 'ABSENT');
            return row;
        });

        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            const loadImg = (path) => new Promise(res => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = path;
            });
            const [rit, ts] = await Promise.all([loadImg(ritLogo), loadImg(techsparkLogo)]);

            // Professional Sidebar & Header
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 5, 210, 'F');
            if (rit) doc.addImage(rit, 'PNG', 12, 10, 48, 15);
            if (ts) doc.addImage(ts, 'PNG', pageWidth - 60, 10, 45, 15);
            doc.setDrawColor(226, 232, 240);
            doc.line(12, 30, pageWidth - 12, 30);

            // Title Block
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(title, pageWidth / 2, 45, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(event.title.toUpperCase(), pageWidth / 2, 52, { align: 'center' });

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150);
            doc.text(`GENERATED BY: ${(organizer?.fullName || 'CENTRAL ORGANIZER').toUpperCase()} | REF: ORG-LOG-${Math.floor(Math.random() * 10000)}`, pageWidth / 2, 58, { align: 'center' });
            doc.text(`EXTRACTION LOGGED: ${new Date().toLocaleString().toUpperCase()}`, pageWidth / 2, 62, { align: 'center' });

            // DUPLICATE Watermark
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.1 }));
            doc.setTextColor(200, 0, 0);
            doc.setFontSize(60);
            doc.text('DUPLICATE', pageWidth / 2, 150, { align: 'center', angle: -45 });
            doc.setFontSize(15);
            doc.text('FOR INTERNAL COORDINATION ONLY', pageWidth / 2, 165, { align: 'center', angle: -45 });
            doc.restoreGraphicsState();

            // Executive Summary
            autoTable(doc, {
                startY: 70,
                head: [['EXECUTIVE SUMMARY METRIC', 'OPERATIONAL DATA']],
                body: summaryMetrics,
                theme: 'striped',
                headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
                bodyStyles: { fontSize: 8, fontStyle: 'bold' },
                columnStyles: { 0: { cellWidth: 60 } },
                margin: { left: 15, right: 15 }
            });

            // Participant Directory
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 10,
                head: tableHead,
                body: tableData,
                headStyles: { fillColor: type === 'ATTENDANCE' ? [16, 185, 129] : [15, 23, 42], fontSize: 7, fontStyle: 'bold' },
                bodyStyles: { fontSize: 6.5 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 10, right: 10 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.cell.text[0] === 'ABSENT') {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });

            // Standard Footer
            const pages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pages; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(160);
                doc.text('AUTHORIZED ORGANIZER EXTRACT | DUPLICATE COPY | TECHSPARK CLUB', pageWidth / 2, 200, { align: 'center' });
            }

            doc.save(`${event.title.replace(/\s+/g, '_')}_${filenameSuffix}_DUPLICATE.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Strategic extraction failed.");
        }
    };

    const handleRemoveRegistration = async (registrationId, studentName) => {
        if (!confirm(`Remove ${studentName} from this operation?`)) return;
        try {
            await deleteDoc(doc(db, 'registrations', registrationId));
            setRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
            alert("Entry purged successfully. 👤🚫");
        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

    if (!organizer) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Validating Tactical Credentials...</p>
                </div>
            </div>
        );
    }

    const renderStepIndicator = () => (
        <div className="flex items-center justify-between mb-12">
            {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${activeStep === step
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : activeStep > step ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-400'
                        }`}>
                        {activeStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                    </div>
                    {step < 4 && (
                        <div className={`h-0.5 flex-1 mx-4 rounded-full ${activeStep > step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* SaaS Dark Sidebar */}
            <aside className="w-80 bg-[#0f172a] flex flex-col fixed inset-y-0 shadow-2xl z-50">
                <div className="p-8 flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">TechSpark</h2>
                        <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">Control Center</p>
                    </div>
                </div>

                <nav className="space-y-1.5 px-4 flex-1 overflow-y-auto custom-scrollbar">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                        { id: 'create', label: 'Create Event', icon: <Plus className="w-5 h-5" /> },
                        { id: 'my_events', label: 'My Events', icon: <Briefcase className="w-5 h-5" /> },
                        { id: 'registrations', label: 'Registrations', icon: <Users className="w-5 h-5" /> },
                        { id: 'submissions', label: 'Live Scores', icon: <Activity className="w-5 h-5" /> },
                        { id: 'reports', label: 'Reports', icon: <TrendingUp className="w-5 h-5" /> },
                        { id: 'profile', label: 'Profile', icon: <UserCog className="w-5 h-5" /> },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setCurrentView(item.id);
                                if (item.id === 'create') {
                                    setActiveStep(1);
                                    setSelectedEvent(null);
                                    setEditingEventId(null);
                                    // Reset form for new event
                                    setFormData({
                                        title: '', type: 'Workshop', shortDescription: '', detailedDescription: '', posterUrl: '',
                                        startDate: '', startTime: '', endDate: '', endTime: '', venueType: 'Offline', venueName: '', googleMapLink: '',
                                        audienceType: 'Whole College', departments: [], years: [], sections: [],
                                        registrationRequired: true, regStartDateTime: '', regEndDateTime: '', maxParticipants: '', waitingList: false,
                                        coordinatorName: '', coordinatorPhone: '', coordinatorEmail: '', displayCoordinator: true,
                                        terms: '', acceptedTerms: false, internalNotes: ''
                                    });
                                }
                                if (item.id !== 'dashboard') setSelectedEvent(null);
                            }}
                            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all text-left ${currentView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'
                                }`}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto p-8 space-y-4 border-t border-white/5 bg-[#0f172a]">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-black italic">
                            {organizer.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate uppercase italic">{organizer.username}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Active Lead</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 py-4 text-slate-500 font-bold text-xs hover:text-red-400 transition-colors uppercase tracking-widest border border-white/5 rounded-xl hover:bg-white/5"
                    >
                        <LogOut className="w-4 h-4" /> Sign Termination
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-80 overflow-y-auto min-h-screen">
                <div className="max-w-7xl mx-auto p-12">
                    <AnimatePresence mode="wait">
                        {currentView === 'dashboard' ? (
                            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <div className="space-y-12 text-left">
                                    <header>
                                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Tactical <span className="text-blue-600">Overview</span></h1>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Organizer Mission Intelligence Portal</p>
                                    </header>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Total Missions', val: stats.total, icon: <Briefcase className="w-5 h-5" />, color: 'blue' },
                                            { label: 'Authorization Pending', val: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'orange' },
                                            { label: 'Live Broadcasts', val: stats.live, icon: <ShieldCheck className="w-5 h-5" />, color: 'emerald' },
                                            { label: 'Total Unit Regs', val: stats.totalRegs, icon: <Users className="w-5 h-5" />, color: 'indigo' }
                                        ].map((s, i) => (
                                            <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
                                                <div className={`w-14 h-14 bg-${s.color}-50 text-${s.color}-600 rounded-2xl flex items-center justify-center shadow-inner`}>
                                                    {s.icon}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{s.label}</p>
                                                    <h3 className="text-3xl font-black text-slate-900 tabular-nums">{s.val}</h3>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">Recent Operations</h3>
                                                <button onClick={() => setCurrentView('my_events')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All Registry</button>
                                            </div>
                                            <div className="space-y-4">
                                                {events.slice(0, 3).map(event => (
                                                    <div key={event.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white transition-all" onClick={() => { setSelectedEvent(event); setCurrentView('my_events'); }}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-300 group-hover:text-blue-600 border border-slate-100">{event.title.charAt(0)}</div>
                                                            <div>
                                                                <h4 className="text-sm font-black text-slate-800 uppercase italic leading-none mb-1">{event.title}</h4>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{event.date}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${event.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                                            }`}>{event.status}</span>
                                                    </div>
                                                ))}
                                                {events.length === 0 && <p className="text-center py-8 text-xs text-slate-400 font-bold italic uppercase">No operations documented.</p>}
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-white">
                                            <h3 className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-6">Authorization Alerts</h3>
                                            <div className="space-y-4">
                                                {events.filter(e => e.status === 'REJECTED').slice(0, 2).map(e => (
                                                    <div key={e.id} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                                        <p className="text-[9px] font-black text-red-500 uppercase mb-1">REJECTED: {e.title}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium line-clamp-2 italic">"{e.remarks}"</p>
                                                    </div>
                                                ))}
                                                {events.filter(e => e.status === 'PENDING').length > 0 && (
                                                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                                                        <p className="text-[9px] font-black text-orange-500 uppercase mb-1">PENDING AUTHORIZATION</p>
                                                        <p className="text-[10px] text-slate-400 font-medium italic">{events.filter(e => e.status === 'PENDING').length} missions awaiting review.</p>
                                                    </div>
                                                )}
                                                {events.filter(e => e.status === 'REJECTED').length === 0 && events.filter(e => e.status === 'PENDING').length === 0 && (
                                                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl opacity-40">
                                                        <CheckCircle className="w-8 h-8 mb-2" />
                                                        <p className="text-[10px] font-black uppercase">All Clear</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : currentView === 'my_events' ? (
                            <motion.div key="my_events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                {selectedEvent ? (
                                    <div className="space-y-12 text-left">
                                        <header className="flex items-center justify-between pb-8 border-b border-slate-200">
                                            <div className="flex items-center gap-6">
                                                <button onClick={() => setSelectedEvent(null)} className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                                                    <ChevronLeft className="w-6 h-6" />
                                                </button>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-widest">{selectedEvent.type}</span>
                                                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${selectedEvent.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                                            }`}>{selectedEvent.status}</span>
                                                    </div>
                                                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{selectedEvent.title}</h1>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {selectedEvent.status === 'LIVE' && (
                                                    <button
                                                        onClick={() => navigate('/checkin')}
                                                        className="px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 uppercase tracking-widest"
                                                    >
                                                        <QrCode className="w-5 h-5" /> Launch Terminal
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setExportType('REGISTRATION');
                                                        setIsExportModalOpen(true);
                                                    }}
                                                    disabled={registrations.length === 0}
                                                    className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl shadow-slate-900/10 hover:bg-black transition-all flex items-center gap-2 uppercase tracking-widest disabled:opacity-30"
                                                >
                                                    <FileText className="w-5 h-5" /> Register Report
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setExportType('ATTENDANCE');
                                                        setIsExportModalOpen(true);
                                                    }}
                                                    disabled={registrations.length === 0}
                                                    className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-emerald-500/10 hover:bg-emerald-700 transition-all flex items-center gap-2 uppercase tracking-widest disabled:opacity-30"
                                                >
                                                    <ShieldCheck className="w-5 h-5" /> Attendee Report
                                                </button>
                                            </div>
                                        </header>

                                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                            <div className="lg:col-span-1 space-y-6">
                                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                                                    <h3 className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-6">Metrics & Logistics</h3>
                                                    <div className="space-y-4">
                                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Timeline</p>
                                                            <p className="text-sm font-black text-slate-800 uppercase">{selectedEvent.date}</p>
                                                        </div>
                                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Strategic Venue</p>
                                                            <p className="text-sm font-black text-slate-800 uppercase">{selectedEvent.venue}</p>
                                                        </div>
                                                        <div className="p-6 bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/10 text-white">
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Registration Velocity</p>
                                                            <div className="flex items-end justify-between mb-4">
                                                                <h4 className="text-3xl font-black italic">{registrations.length}</h4>
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">OF {selectedEvent.maxParticipants}</p>
                                                            </div>
                                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((registrations.length / selectedEvent.maxParticipants) * 100, 100)}%` }} className="h-full bg-blue-500" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-3">
                                                <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden h-full flex flex-col">
                                                    {/* Search & Filter Bar */}
                                                    <div className="p-6 border-b border-slate-100 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">Registered Participants</h3>
                                                            <div className="flex items-center gap-3">
                                                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
                                                                    {registrations.length} Total
                                                                </span>
                                                                {regSearchQuery || regDeptFilter !== 'all' || regYearFilter !== 'all' ? (
                                                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                                                                        {getFilteredRegistrations().length} Filtered
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        {/* Search Input */}
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1 relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search by name or roll number..."
                                                                    value={regSearchQuery}
                                                                    onChange={(e) => setRegSearchQuery(e.target.value)}
                                                                    className="w-full px-5 py-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                                                />
                                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            </div>

                                                            {/* Department Filter */}
                                                            <select
                                                                value={regDeptFilter}
                                                                onChange={(e) => setRegDeptFilter(e.target.value)}
                                                                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 uppercase"
                                                            >
                                                                <option value="all">All Depts</option>
                                                                {getUniqueValues('studentDept').map(dept => (
                                                                    <option key={dept} value={dept}>{dept}</option>
                                                                ))}
                                                            </select>

                                                            {/* Year Filter */}
                                                            <select
                                                                value={regYearFilter}
                                                                onChange={(e) => setRegYearFilter(e.target.value)}
                                                                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 uppercase"
                                                            >
                                                                <option value="all">All Years</option>
                                                                {getUniqueValues('studentYear').map(year => (
                                                                    <option key={year} value={year}>{year} Year</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Participant List */}
                                                    <div className="p-6 overflow-y-auto flex-1 max-h-[500px] space-y-3 custom-scrollbar">
                                                        {loadingRegs ? (
                                                            <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-40">
                                                                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Accessing Directory...</p>
                                                            </div>
                                                        ) : getFilteredRegistrations().length > 0 ? getFilteredRegistrations().map((reg) => (
                                                            <div key={reg.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 hover:bg-blue-50/10 transition-all">
                                                                <div className="flex items-center gap-5">
                                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black bg-white border border-slate-200 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                                                                        {reg.studentName?.charAt(0) || '?'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-3">
                                                                            <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{reg.studentName}</h4>
                                                                            {(reg.status === 'Present' || reg.isAttended) && (
                                                                                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded uppercase tracking-widest">
                                                                                    CHECKED-IN
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                            <span className="text-blue-600">{reg.studentRoll}</span>
                                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                            <span>{reg.studentDept}</span>
                                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                            <span>{reg.studentYear} Year</span>
                                                                            {reg.isTeamRegistration && (
                                                                                <>
                                                                                    <span className="w-1 h-1 bg-blue-300 rounded-full" />
                                                                                    <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded italic">
                                                                                        Squad: {reg.teamName} ({reg.teamRole})
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                            {selectedEvent?.type === 'Hackathon' && reg.problemStatement && (
                                                                                <>
                                                                                    <span className="w-1 h-1 bg-purple-300 rounded-full" />
                                                                                    <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-1">
                                                                                        <Zap className="w-2.5 h-2.5" /> {reg.problemStatement}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Participant Actions - Only show if event is NOT completed */}
                                                                {selectedEvent?.status !== 'COMPLETED' ? (
                                                                    <div className="flex items-center gap-2">
                                                                        {(reg.status === 'Present' || reg.isAttended) && (
                                                                            <button
                                                                                onClick={() => handleUndoCheckIn(reg.id)}
                                                                                className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-2 border border-emerald-100 shadow-sm"
                                                                            >
                                                                                <RotateCcw className="w-4 h-4" /> UNDO
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleDeleteRegistration(reg.id, reg.eventId)}
                                                                            className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2 border border-slate-100 shadow-sm"
                                                                        >
                                                                            <UserMinus className="w-4 h-4" /> REMOVE
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                                                            {reg.registeredAt?.toDate ? new Date(reg.registeredAt.toDate()).toLocaleDateString() : 'Registered'}
                                                                        </span>
                                                                        {(reg.status === 'Present' || reg.isAttended) ? (
                                                                            <span className="text-[8px] text-emerald-500 font-black uppercase tracking-tighter">Verified Participation</span>
                                                                        ) : (
                                                                            <span className="text-[8px] text-red-500 font-black uppercase tracking-widest">ABSENT</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )) : (
                                                            <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-30">
                                                                <Users className="w-12 h-12 text-slate-300" />
                                                                <p className="text-xs font-black uppercase tracking-widest">
                                                                    {registrations.length === 0 ? 'No Registrations Yet' : 'No Matching Results'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-12 text-left">
                                        <header>
                                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Operation <span className="text-blue-600">Registry</span></h1>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Managing your commissioned missions</p>
                                        </header>

                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                            {events.map((event) => (
                                                <div key={event.id} className="group bg-white border border-slate-200 rounded-[3rem] p-8 hover:shadow-2xl hover:shadow-slate-200/50 hover:border-blue-500 transition-all duration-500 flex flex-col relative overflow-hidden">
                                                    {/* Status Badges */}
                                                    <div className="flex items-center justify-between mb-6">
                                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-widest">{event.type}</span>
                                                        <div className="flex items-center gap-2">
                                                            {event.status === 'LIVE' && event.registrationOpen !== false && (
                                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded uppercase">REG OPEN</span>
                                                            )}
                                                            {event.status === 'LIVE' && event.registrationOpen === false && (
                                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[8px] font-black rounded uppercase">REG CLOSED</span>
                                                            )}
                                                            <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${event.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600' :
                                                                event.status === 'COMPLETED' ? 'bg-blue-50 text-blue-600' :
                                                                    event.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                                                        event.status === 'DRAFT' ? 'bg-slate-100 text-slate-500' :
                                                                            'bg-orange-50 text-orange-600'
                                                                }`}>{event.status}</span>
                                                        </div>
                                                    </div>

                                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-[1.1] mb-6 min-h-[52px] group-hover:text-blue-600 transition-colors">{event.title}</h3>

                                                    <div className="space-y-4 mb-8">
                                                        <div className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                                            <Calendar className="w-4 h-4 text-blue-500" /> {event.date}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-[0.1em] bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                                                            <Activity className="w-4 h-4" />
                                                            <span className="tabular-nums">
                                                                {allRegs.filter(r => r.eventId === event.id && (r.isAttended || r.status === 'Present')).length} IN
                                                            </span>
                                                            <span className="text-slate-300 mx-1">/</span>
                                                            <span className="text-slate-400 tabular-nums">
                                                                {event.attendeesCount || 0} REGS
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col gap-3">
                                                        {/* Rejected Event Feedback */}
                                                        {event.status === 'REJECTED' && (
                                                            <div className="mb-2 p-3 bg-red-50 rounded-xl border border-red-100">
                                                                <p className="text-[9px] font-black text-red-600 uppercase mb-1">Admin Feedback</p>
                                                                <p className="text-[10px] text-slate-600 font-medium italic">"{event.remarks}"</p>
                                                            </div>
                                                        )}

                                                        {/* Main Action Button */}
                                                        <button onClick={() => handleViewDetails(event)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                                                            ACCESS CONSOLE <ArrowRight className="w-4 h-4" />
                                                        </button>

                                                        {/* Quick Actions Row */}
                                                        <div className="flex flex-wrap items-center gap-3 px-1 mt-2">
                                                            {/* DRAFT/REJECTED: Edit & Resubmit */}
                                                            {(event.status === 'DRAFT' || event.status === 'REJECTED') && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleEditEvent(event)}
                                                                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                                                    >
                                                                        <Settings className="w-3 h-3" /> Edit
                                                                    </button>
                                                                    <button onClick={async () => {
                                                                        if (!confirm("Submit for authorization?")) return;
                                                                        await updateDoc(doc(db, 'events', event.id), { status: 'PENDING', remarks: '' });
                                                                    }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Resubmit</button>
                                                                </>
                                                            )}

                                                            {/* LIVE: Close/Reopen Registration & Mark Complete */}
                                                            {event.status === 'LIVE' && (
                                                                <>
                                                                    {event.registrationOpen !== false ? (
                                                                        <button
                                                                            onClick={() => handleCloseRegistration(event.id)}
                                                                            className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                                                        >
                                                                            <X className="w-3 h-3" /> Close Reg
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleReopenRegistration(event.id)}
                                                                            className="text-[10px] font-black text-green-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                                                        >
                                                                            <CheckCircle className="w-3 h-3" /> Reopen Reg
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleMarkComplete(event.id)}
                                                                        className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3" /> Complete
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* COMPLETED: View Feedback */}
                                                            {event.status === 'COMPLETED' && (
                                                                <button
                                                                    onClick={() => handleViewFeedback(event.id)}
                                                                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                                                >
                                                                    <Activity className="w-3 h-3" /> Pulse
                                                                </button>
                                                            )}

                                                            {/* Delete for non-LIVE/non-COMPLETED events */}
                                                            {(event.status === 'DRAFT' || event.status === 'REJECTED') && (
                                                                <button
                                                                    onClick={() => handleDeleteEvent(event.id)}
                                                                    className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 ml-auto"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : currentView === 'registrations' ? (
                            <motion.div key="registrations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="space-y-8 text-left">
                                    <header className="flex items-center justify-between">
                                        <div>
                                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Unit <span className="text-blue-600">Oracle</span></h1>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Global participant manifest across all operations</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const csv = [['Operation', 'Name', 'Roll Number', 'Branch', 'Year'], ...allRegs.map(r => [r.eventTitle, r.studentName, r.studentRoll, r.studentDept, r.studentYear])].map(e => e.join(",")).join("\n");
                                                const blob = new Blob([csv], { type: 'text/csv' });
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.setAttribute('href', url);
                                                a.setAttribute('download', 'techspark_manifest.csv');
                                                a.click();
                                            }}
                                            className="px-6 py-4 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" /> Export CSV
                                        </button>
                                    </header>

                                    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[500px]">
                                        <table className="w-full text-left">
                                            <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                <tr>
                                                    <th className="px-8 py-6">Operation Objective</th>
                                                    <th className="px-8 py-6">Unit Signature</th>
                                                    <th className="px-8 py-6">Identity Trace</th>
                                                    <th className="px-8 py-6 text-right">Operational Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {allRegs.map((reg) => (
                                                    <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-8 py-6">
                                                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight italic">{reg.eventTitle}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{reg.eventId?.slice(0, 8)}</p>
                                                        </td>
                                                        <td className="px-8 py-6 font-black text-slate-700 uppercase italic text-xs">{reg.studentName}</td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-[10px] font-black text-blue-600 uppercase tabular-nums">{reg.studentRoll}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{reg.studentDept}</p>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                {(reg.status === 'Present' || reg.isAttended) ? (
                                                                    <>
                                                                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">VERIFIED</span>
                                                                        <button
                                                                            onClick={() => handleUndoCheckIn(reg.id)}
                                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                            title="Undo Check-in"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <span className="bg-slate-50 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">REGISTERED</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {allRegs.length === 0 && (
                                                    <tr>
                                                        <td colSpan="4" className="px-8 py-20 text-center text-slate-300 font-black uppercase italic text-xs">Awaiting Global Registrations</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        ) : currentView === 'submissions' ? (
                            <motion.div key="submissions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="space-y-8 text-left">
                                    <header className="flex items-center justify-between">
                                        <div>
                                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Live <span className="text-blue-600">Scores</span></h1>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Real-time event performance and evaluation data</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (submissions.length === 0) return;
                                                const csv = [['Event', 'Student Name', 'Roll Number', 'Score', 'Submitted At'], ...submissions.map(s => [s.eventTitle, s.name, s.rollNumber, s.score, s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : 'N/A'])].map(e => e.join(",")).join("\n");
                                                const blob = new Blob([csv], { type: 'text/csv' });
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.setAttribute('href', url);
                                                a.setAttribute('download', 'techspark_quiz_results.csv');
                                                a.click();
                                            }}
                                            className="px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                                        >
                                            <Download className="w-4 h-4" /> Export Results
                                        </button>
                                    </header>

                                    {loadingSubmissions ? (
                                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intercepting Incoming Packets...</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-6">
                                            {submissions.length > 0 ? (
                                                <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                            <tr>
                                                                <th className="px-8 py-6">Operation / Quiz</th>
                                                                <th className="px-8 py-6">Agent Identity</th>
                                                                <th className="px-8 py-6">Performance Metric</th>
                                                                <th className="px-8 py-6 text-right">Submission Time</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {submissions.map((sub) => (
                                                                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                                                                    <td className="px-8 py-6">
                                                                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight italic">{sub.eventTitle || 'Untitled Quiz'}</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{sub.eventId?.slice(0, 8)}</p>
                                                                    </td>
                                                                    <td className="px-8 py-6">
                                                                        <p className="font-black text-slate-700 uppercase italic text-sm">{sub.name}</p>
                                                                        <p className="text-[10px] font-bold text-blue-600 uppercase tabular-nums">{sub.rollNumber}</p>
                                                                    </td>
                                                                    <td className="px-8 py-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-sm border border-blue-100 italic">
                                                                                {sub.score || 0} PTS
                                                                            </div>
                                                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className="h-full bg-blue-600"
                                                                                    style={{ width: `${Math.min((sub.score / 100) * 100, 100)}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-right">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                            {sub.timestamp?.toDate ? sub.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                                        </p>
                                                                        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                                                                            {sub.timestamp?.toDate ? sub.timestamp.toDate().toLocaleDateString() : 'LOGGED'}
                                                                        </p>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="h-96 bg-white border border-slate-200 border-dashed rounded-[3rem] flex flex-col items-center justify-center gap-6 opacity-40">
                                                    <Activity className="w-16 h-16 text-slate-300" />
                                                    <div className="text-center">
                                                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Awaiting Submissions</h3>
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">No live data signals detected for your operations</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : currentView === 'reports' ? (
                            <motion.div key="reports" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                                <div className="space-y-8 text-left">
                                    <header>
                                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Mission <span className="text-blue-600">Intelligence</span></h1>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Strategic impact and participation analytics</p>
                                    </header>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {[
                                            { title: 'Demographic Reach', desc: 'Department and Year-wise breakdown of participants.', icon: <Users className="w-6 h-6" /> },
                                            { title: 'Engagement Study', desc: 'Operation popularity and registration velocity trends.', icon: <TrendingUp className="w-6 h-6" /> },
                                            { title: 'Operational Audit', desc: 'Complete mission logs and coordinator activity.', icon: <ClipboardList className="w-6 h-6" /> }
                                        ].map((rep, i) => (
                                            <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                                                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">{rep.icon}</div>
                                                <h4 className="text-xl font-black text-slate-800 uppercase italic mb-2">{rep.title}</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed mb-8">{rep.desc}</p>
                                                <button onClick={() => alert("Report generation sequence initiated. High-fidelity PDF will be ready in 10s.")} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">Generate PDF Intel</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : currentView === 'profile' ? (
                            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                <div className="max-w-2xl mx-auto space-y-8 text-left">
                                    <header>
                                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Lead <span className="text-blue-600">Identity</span></h1>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Credential and persona management terminal</p>
                                    </header>

                                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                                        <div className="flex items-center gap-8 pb-8 border-b border-slate-50">
                                            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white italic shadow-2xl">
                                                {organizer.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-1">{profileData.fullName}</h3>
                                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em]">{organizer.username} | {profileData.department}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            {[
                                                { label: 'Full Identity', key: 'fullName', type: 'text' },
                                                { label: 'Official Email', key: 'email', type: 'email' },
                                                { label: 'Contact Trace', key: 'phone', type: 'tel' },
                                                { label: 'Operational Dept', key: 'department', type: 'text' }
                                            ].map(field => (
                                                <div key={field.key} className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                    <input
                                                        type={field.type}
                                                        value={profileData[field.key]}
                                                        onChange={(e) => setProfileData({ ...profileData, [field.key]: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-800 text-sm focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4">
                                            <button
                                                onClick={() => alert("Identity parameters successfully synchronized.")}
                                                className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all"
                                            >Synchronize Profile Credentials</button>
                                        </div>

                                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-800 uppercase italic">Authorization Password</p>
                                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-1">Last rotated 14 cycles ago</p>
                                            </div>
                                            <button className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Change Passkey</button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : currentView === 'create' ? (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="max-w-4xl mx-auto"
                            >
                                <div className="mb-12 text-left">
                                    <button
                                        onClick={() => resetFormAndGoBack()}
                                        className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-900 transition-colors mb-4"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> {editingEventId ? 'CANCEL EDITING' : 'REVERT TO DASHBOARD'}
                                    </button>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                                        {editingEventId ? 'Modify' : 'Strategic Event'} <span className="text-blue-600">{editingEventId ? 'Event' : 'Creation'}</span>
                                    </h1>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">
                                        {editingEventId ? 'Update event details and resubmit for approval' : 'Authorization Workflow Protocol v2.4'}
                                    </p>
                                </div>

                                {renderStepIndicator()}

                                <div className="bg-white border border-slate-200 rounded-[3rem] shadow-2xl p-12 text-left relative overflow-hidden">
                                    {/* Step 1: Basic Details */}
                                    {activeStep === 1 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                            <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                    <Info className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-blue-900 uppercase">Core Identification</h4>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Event Title *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. QUANTUM COMPUTING HACKATHON"
                                                        value={formData.title}
                                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-black text-slate-800 uppercase italic transition-all"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Event Type *</label>
                                                        <select
                                                            value={formData.type}
                                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                            className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-black text-slate-800 transition-all uppercase"
                                                        >
                                                            <option>Workshop</option>
                                                            <option>Seminar</option>
                                                            <option>Hackathon</option>
                                                            <option>Quiz</option>
                                                            <option>Webinar</option>
                                                            <option>Expo</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Operation Poster (URL)</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                placeholder="IMAGE_ASSET_LINK"
                                                                value={formData.posterUrl}
                                                                onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                                                                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-black text-slate-800 transition-all"
                                                            />
                                                            <Upload className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mission Briefing (Short Abstract) *</label>
                                                    <textarea
                                                        rows="2"
                                                        placeholder="1-2 lines summarizing the event scope..."
                                                        value={formData.shortDescription}
                                                        onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 outline-none font-bold text-slate-800 transition-all resize-none"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Operational Scope *</label>
                                                    <textarea
                                                        rows="5"
                                                        placeholder="Describe modules, learning paths, and technical depth..."
                                                        value={formData.detailedDescription}
                                                        onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                                                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-500/5 outline-none font-medium text-slate-800 transition-all"
                                                    />
                                                </div>

                                                {/* Hackathon Specific: Problem Statements */}
                                                {formData.type === 'Hackathon' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="pt-6 border-t border-slate-100 space-y-6"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="text-sm font-black text-slate-900 uppercase italic">Problem Statement Repository</h4>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Define challenges or enable open innovation</p>
                                                            </div>
                                                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                                                                <input
                                                                    type="checkbox"
                                                                    id="allowOpenStatement"
                                                                    checked={formData.allowOpenStatement}
                                                                    onChange={(e) => setFormData({ ...formData, allowOpenStatement: e.target.checked })}
                                                                    className="w-4 h-4 rounded accent-blue-600"
                                                                />
                                                                <label htmlFor="allowOpenStatement" className="text-[10px] font-black text-slate-600 uppercase tracking-tight cursor-pointer">Allow Open Innovation (Custom Statements)</label>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            {(formData.problemStatements || []).map((ps, idx) => (
                                                                <div key={idx} className="flex gap-2">
                                                                    <div className="flex-1 flex items-center gap-4 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl">
                                                                        <span className="text-xs font-black text-blue-600">#{idx + 1}</span>
                                                                        <input
                                                                            type="text"
                                                                            value={ps}
                                                                            onChange={(e) => {
                                                                                const newPS = [...formData.problemStatements];
                                                                                newPS[idx] = e.target.value;
                                                                                setFormData({ ...formData, problemStatements: newPS });
                                                                            }}
                                                                            placeholder="Define a specific challenge..."
                                                                            className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 text-sm"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newPS = formData.problemStatements.filter((_, i) => i !== idx);
                                                                            setFormData({ ...formData, problemStatements: newPS });
                                                                        }}
                                                                        className="p-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                                                    >
                                                                        <X className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => setFormData({ ...formData, problemStatements: [...(formData.problemStatements || []), ''] })}
                                                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Plus className="w-4 h-4" /> Add Problem Statement
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {/* Quiz Specific: Google Form Integration */}
                                                {formData.type === 'Quiz' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="pt-6 border-t border-slate-100 space-y-6"
                                                    >
                                                        <div className="flex items-center gap-4 p-5 bg-purple-50 rounded-2xl border border-purple-100">
                                                            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                                                                <FileText className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black text-purple-900 uppercase italic">Quiz Integration Setup</h4>
                                                                <p className="text-[10px] text-purple-500 font-bold">Connect your Google Form for automated student verification</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google Form URL *</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="https://docs.google.com/forms/d/e/..."
                                                                        value={formData.quizFormUrl}
                                                                        onChange={(e) => {
                                                                            const url = e.target.value;
                                                                            let updatedData = { ...formData, quizFormUrl: url };

                                                                            // Magic Extraction Logic
                                                                            if (url.includes('entry.')) {
                                                                                try {
                                                                                    const urlObj = new URL(url);
                                                                                    const searchParams = new URLSearchParams(urlObj.search);
                                                                                    let extractedAny = false;

                                                                                    // Create a map of values to look for
                                                                                    const mappings = {
                                                                                        quizEntryName: ['name', 'student', 'test', 'full'],
                                                                                        quizEntryRoll: ['roll', 'reg', '123', 'number', 'id'],
                                                                                        quizEntryDept: ['dept', 'branch', 'cse', 'it', 'department'],
                                                                                        quizEntryYear: ['year', '1st', '2nd', '3rd', '4th'],
                                                                                        quizEntrySection: ['sec', 'section', 'a', 'b', 'c'],
                                                                                        quizEntryMobile: ['phone', 'mobile', 'contact', '987']
                                                                                    };

                                                                                    searchParams.forEach((value, key) => {
                                                                                        if (key.startsWith('entry.')) {
                                                                                            extractedAny = true;
                                                                                            const lowerVal = value.toLowerCase();

                                                                                            // Try to find which field this belongs to
                                                                                            for (const [field, keywords] of Object.entries(mappings)) {
                                                                                                if (keywords.some(k => k.length <= 1 ? lowerVal === k : lowerVal.includes(k))) {
                                                                                                    updatedData[field] = key;
                                                                                                    break;
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    });

                                                                                    if (extractedAny) {
                                                                                        // Set the base URL (strip params)
                                                                                        updatedData.quizFormUrl = url.split('?')[0];
                                                                                        alert("✨ Magic Extraction Successful! I've automatically identified and mapped your Form Entry IDs. Please verify them below.");
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.log("Extraction failed, proceeding with literal URL");
                                                                                }
                                                                            }

                                                                            setFormData(updatedData);
                                                                        }}
                                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-800 pr-12"
                                                                    />
                                                                    {(formData.quizFormUrl || '').includes('docs.google.com') && (
                                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                                            <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="p-5 bg-slate-900 rounded-2xl space-y-4">
                                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pre-fill Entry IDs (from Google Form's "Get pre-filled link")</p>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Name Field Entry ID</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="entry.123456789"
                                                                            value={formData.quizEntryName}
                                                                            onChange={(e) => setFormData({ ...formData, quizEntryName: e.target.value })}
                                                                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white placeholder:text-slate-600"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Roll Number Entry ID</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="entry.987654321"
                                                                            value={formData.quizEntryRoll}
                                                                            onChange={(e) => setFormData({ ...formData, quizEntryRoll: e.target.value })}
                                                                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white placeholder:text-slate-600"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Department Entry ID</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="entry.111222333"
                                                                            value={formData.quizEntryDept}
                                                                            onChange={(e) => setFormData({ ...formData, quizEntryDept: e.target.value })}
                                                                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white placeholder:text-slate-600"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Year Entry ID</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="entry.444555666"
                                                                            value={formData.quizEntryYear}
                                                                            onChange={(e) => setFormData({ ...formData, quizEntryYear: e.target.value })}
                                                                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white placeholder:text-slate-600"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Section Entry ID</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="entry.777888999"
                                                                            value={formData.quizEntrySection}
                                                                            onChange={(e) => setFormData({ ...formData, quizEntrySection: e.target.value })}
                                                                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white placeholder:text-slate-600"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Mobile Entry ID</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="entry.000111222"
                                                                            value={formData.quizEntryMobile}
                                                                            onChange={(e) => setFormData({ ...formData, quizEntryMobile: e.target.value })}
                                                                            className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white placeholder:text-slate-600"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <p className="text-[9px] text-slate-500 font-medium italic">💡 Get these IDs from Google Form → ⋮ Menu → "Get pre-filled link" → Fill dummy values → Copy link & extract entry.XXXXX IDs</p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 2: Date & Venue */}
                                    {activeStep === 2 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                            <div className="flex items-center gap-4 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                    <MapPin className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-indigo-900 uppercase">Spatiotemporal Logistics</h4>
                                                    <p className="text-xs text-indigo-600 font-medium">Configuring mission timeline and base location</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 font-black italic">
                                                            <Clock className="w-4 h-4" /> Start Phase
                                                        </h5>
                                                        <div className="space-y-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                                                                <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-800 outline-none" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</label>
                                                                <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-800 outline-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 font-black italic">
                                                            <Clock className="w-4 h-4" /> Termination Phase
                                                        </h5>
                                                        <div className="space-y-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                                                                <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-800 outline-none" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</label>
                                                                <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-800 outline-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="flex items-center gap-8 p-8 bg-slate-900 rounded-[2.5rem] shadow-xl">
                                                    <div className="flex flex-col gap-4">
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base Type</label>
                                                        <div className="flex gap-4">
                                                            {['Offline', 'Online', 'Hybrid'].map((v) => (
                                                                <button
                                                                    key={v}
                                                                    type="button"
                                                                    onClick={() => setFormData({ ...formData, venueType: v })}
                                                                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.venueType === v ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                                        }`}
                                                                >
                                                                    {v}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Venue Designation / Platform Link</label>
                                                        <input
                                                            type="text"
                                                            placeholder={formData.venueType === 'Online' ? "ZOOM / MEET LINK" : "BLOCK-B, LAB 402"}
                                                            value={formData.venueName}
                                                            onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                                                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-sm text-white placeholder:text-slate-700"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 3: Audience & Registration */}
                                    {activeStep === 3 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                            <div className="flex items-center gap-4 p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                    <Users className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-emerald-900 uppercase">Target Audience Protocol</h4>
                                                    <p className="text-xs text-emerald-600 font-medium">Calibrating accessibility and capacity metrics</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Eligibility Scope</h5>
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audience Class</label>
                                                                <select
                                                                    value={formData.audienceType}
                                                                    onChange={(e) => setFormData({ ...formData, audienceType: e.target.value })}
                                                                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl font-black text-sm text-slate-800 outline-none"
                                                                >
                                                                    <option>Whole College</option>
                                                                    <option>Department Wise</option>
                                                                    <option>Year Wise</option>
                                                                    <option>Section Wise</option>
                                                                    <option>Custom</option>
                                                                </select>
                                                            </div>
                                                            {formData.audienceType === 'Department Wise' && (
                                                                <div className="space-y-3">
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Departments</label>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {globalDemographics.departments.map(dept => (
                                                                            <button
                                                                                key={dept}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const depts = formData.departments.includes(dept)
                                                                                        ? formData.departments.filter(d => d !== dept)
                                                                                        : [...formData.departments, dept];
                                                                                    setFormData({ ...formData, departments: depts });
                                                                                }}
                                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${formData.departments.includes(dept) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                                                                    }`}
                                                                            >
                                                                                {dept}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {formData.audienceType === 'Year Wise' && (
                                                                <div className="space-y-3">
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Years</label>
                                                                    <div className="flex gap-3 flex-wrap">
                                                                        {globalDemographics.years.map(year => (
                                                                            <button
                                                                                key={year}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const years = formData.years.includes(year)
                                                                                        ? formData.years.filter(y => y !== year)
                                                                                        : [...formData.years, year];
                                                                                    setFormData({ ...formData, years: years });
                                                                                }}
                                                                                className={`w-12 h-12 rounded-xl text-xs font-black transition-all ${formData.years.includes(year) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                                                                    }`}
                                                                            >
                                                                                {year}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {(formData.audienceType === 'Section Wise' || formData.audienceType === 'Custom') && (
                                                                <div className="space-y-4">
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <select
                                                                            onChange={(e) => setFormData({ ...formData, departments: [e.target.value] })}
                                                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase"
                                                                        >
                                                                            <option>Select Dept</option>
                                                                            <option>CSE</option><option>IT</option><option>AI-DS</option>
                                                                        </select>
                                                                        <select
                                                                            onChange={(e) => setFormData({ ...formData, years: [e.target.value] })}
                                                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase"
                                                                        >
                                                                            <option>Select Year</option>
                                                                            <option>I</option><option>II</option><option>III</option><option>IV</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {globalDemographics.sections.map(sec => (
                                                                            <button
                                                                                key={sec}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const secs = formData.sections.includes(sec)
                                                                                        ? formData.sections.filter(s => s !== sec)
                                                                                        : [...formData.sections, sec];
                                                                                    setFormData({ ...formData, sections: secs });
                                                                                }}
                                                                                className={`w-10 h-10 rounded-lg text-xs font-black transition-all ${formData.sections.includes(sec) ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500'
                                                                                    }`}
                                                                            >
                                                                                {sec}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="p-4 bg-slate-900 rounded-2xl border border-white/5">
                                                                <p className="text-[9px] font-black text-blue-400 uppercase mb-2">Target Eligibility Summary</p>
                                                                <p className="text-[10px] font-bold text-slate-400 italic">
                                                                    {formData.audienceType === 'Whole College' ? 'OPEN ACCESS TO ALL STUDENTS' : (
                                                                        `RESTRICTED TO: ${formData.departments.join(', ') || 'ALL'} ${formData.years.length ? `(YEAR ${formData.years.join(', ')})` : ''} ${formData.sections.length ? `[SEC ${formData.sections.join(', ')}]` : ''}`
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl text-white">
                                                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Capacity Terminal</h5>
                                                        <div className="space-y-6">
                                                            <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group" onClick={() => setFormData({ ...formData, registrationRequired: !formData.registrationRequired })}>
                                                                <label className="text-[10px] font-black uppercase tracking-widest cursor-pointer group-hover:text-blue-400 transition-colors">Entry Registration</label>
                                                                <div
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.registrationRequired ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.registrationRequired ? 'right-1' : 'left-1'}`} />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Max Deployment Units (Participants)</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        placeholder="100"
                                                                        value={formData.maxParticipants}
                                                                        onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                                                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl font-black text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                                                                    />
                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setFormData(prev => ({ ...prev, maxParticipants: (parseInt(prev.maxParticipants) || 0) + 10 }))}
                                                                            className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-all"
                                                                        >
                                                                            <ChevronUp className="w-3 h-3" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setFormData(prev => ({ ...prev, maxParticipants: Math.max(0, (parseInt(prev.maxParticipants) || 0) - 10) }))}
                                                                            className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-all"
                                                                        >
                                                                            <ChevronDown className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group" onClick={() => setFormData({ ...formData, waitingList: !formData.waitingList })}>
                                                                <label className="text-[10px] font-black uppercase tracking-widest cursor-pointer group-hover:text-indigo-400 transition-colors">Enable Awaiting List</label>
                                                                <div
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.waitingList ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.waitingList ? 'right-1' : 'left-1'}`} />
                                                                </div>
                                                            </div>

                                                            <div className="pt-4 mt-4 border-t border-white/10 space-y-6">
                                                                <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group" onClick={() => setFormData({ ...formData, isTeamEvent: !formData.isTeamEvent })}>
                                                                    <div>
                                                                        <label className="text-[10px] font-black uppercase tracking-widest block text-blue-400 cursor-pointer group-hover:text-emerald-400 transition-colors">Team Participation</label>
                                                                        <p className="text-[9px] text-slate-500 font-medium">Require students to register as teams</p>
                                                                    </div>
                                                                    <div
                                                                        className={`w-12 h-6 rounded-full transition-all relative ${formData.isTeamEvent ? 'bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-slate-700'}`}
                                                                    >
                                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isTeamEvent ? 'right-1' : 'left-1'}`} />
                                                                    </div>
                                                                </div>

                                                                {formData.isTeamEvent && (
                                                                    <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Min Team Size</label>
                                                                            <input
                                                                                type="number"
                                                                                value={formData.minTeamSize}
                                                                                onChange={(e) => setFormData({ ...formData, minTeamSize: e.target.value })}
                                                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-sm text-white outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Max Team Size</label>
                                                                            <input
                                                                                type="number"
                                                                                value={formData.maxTeamSize}
                                                                                onChange={(e) => setFormData({ ...formData, maxTeamSize: e.target.value })}
                                                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-sm text-white outline-none"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 4: Finalize */}
                                    {activeStep === 4 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                            <div className="flex items-center gap-4 p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl">
                                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                    <Shield className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase tracking-tight italic">Authorization Transmission</h4>
                                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">FinalIZING Operation Control parameters</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Mission Coordinator</h5>
                                                        <div className="space-y-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Full Designation Name</label>
                                                                <input type="text" value={formData.coordinatorName} onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Communication Channel (Phone)</label>
                                                                <input type="text" value={formData.coordinatorPhone} onChange={(e) => setFormData({ ...formData, coordinatorPhone: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none" />
                                                            </div>
                                                            <div className="flex items-center gap-3 py-2">
                                                                <input type="checkbox" checked={formData.displayCoordinator} onChange={(e) => setFormData({ ...formData, displayCoordinator: e.target.checked })} className="w-5 h-5 rounded-lg accent-blue-600" />
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Publically Project Identity</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 h-full flex flex-col">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Internal Intel</h5>
                                                        <textarea
                                                            rows="6"
                                                            placeholder="Private notes for Super Admin and internal tracking..."
                                                            value={formData.internalNotes}
                                                            onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                                                            className="w-full flex-1 px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-medium text-slate-600 resize-none italic text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20">
                                                <div className="flex items-start gap-4">
                                                    <input
                                                        type="checkbox"
                                                        id="terms"
                                                        checked={formData.acceptedTerms}
                                                        onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                                                        className="mt-1 w-6 h-6 rounded-lg accent-white bg-transparent border-2 border-white/30"
                                                    />
                                                    <div>
                                                        <label htmlFor="terms" className="text-sm font-black uppercase italic tracking-tighter">I certify that this operation adheres to the club's technical standards and college policy.</label>
                                                        <p className="text-[10px] text-white/60 font-medium mt-1">Submission will lock specific fields until Authorization Review is complete.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-100">
                                        <div className="flex gap-4">
                                            {activeStep === 1 ? (
                                                <button
                                                    onClick={() => { if (confirm("Discard all draft data?")) setCurrentView('dashboard'); }}
                                                    className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
                                                >
                                                    Discard
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setActiveStep(prev => prev - 1)}
                                                    className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                                                >
                                                    <ChevronLeft className="w-4 h-4" /> Previous Step
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleCreateEvent('DRAFT')}
                                                className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all flex items-center gap-2"
                                            >
                                                <Save className="w-4 h-4" /> Save as Draft
                                            </button>
                                        </div>

                                        <div className="flex gap-4">
                                            <button className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white border border-slate-200 transition-all flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-blue-500" /> Preview
                                            </button>
                                            {activeStep < 4 ? (
                                                <button
                                                    onClick={() => setActiveStep(prev => prev + 1)}
                                                    className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                                >
                                                    Progress Next <ChevronRight className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleCreateEvent('PENDING')}
                                                    disabled={isSubmitting}
                                                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-2 disabled:bg-slate-400"
                                                >
                                                    {isSubmitting ? 'TRANSMITTING...' : 'SUBMIT FOR APPROVAL'} <Send className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-center gap-8 opacity-40">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End-to-End Encryption</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Admin Channel</p>
                                    </div>
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </main>

            {/* Global Custom Scrollbar Style */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>

            {/* Feedback Visualization Modal */}
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
                            className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] z-10"
                        >
                            {/* Header */}
                            <div className="p-8 bg-slate-900 text-white text-left relative shrink-0">
                                <button
                                    onClick={() => setShowFeedbackModal(false)}
                                    className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-2xl font-black uppercase italic tracking-tight">Mission Intelligence</h3>
                                            {selectedEventFeedback.length > 0 && (
                                                <button
                                                    onClick={handleDownloadFeedbackPDF}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                                >
                                                    <Download className="w-3.5 h-3.5" /> Download Report
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Real-time feedback & Strategic Insights</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
                                {loadingFeedback ? (
                                    <div className="py-20 flex flex-col items-center gap-4 opacity-50">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Decrypting Response Cloud...</p>
                                    </div>
                                ) : selectedEventFeedback.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center gap-4 opacity-30">
                                        <Zap className="w-12 h-12 text-slate-400" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">No tactical feedback received yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 pt-8">
                                        {/* Stats Summary */}
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Avg. Performance</p>
                                                <div className="flex items-end gap-2">
                                                    <h4 className="text-3xl font-black italic text-slate-900">
                                                        {(selectedEventFeedback.reduce((acc, curr) => acc + curr.rating, 0) / selectedEventFeedback.length).toFixed(1)}
                                                    </h4>
                                                    <span className="text-xs font-bold text-blue-600 mb-1">/ 5.0</span>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Response Volume</p>
                                                <h4 className="text-3xl font-black italic text-slate-900">{selectedEventFeedback.length}</h4>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {selectedEventFeedback.map((item, idx) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="p-6 rounded-3xl border border-slate-100 bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left"
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div>
                                                            <h5 className="text-sm font-black text-slate-800 uppercase italic">{item.studentName}</h5>
                                                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">{item.studentRoll} • {item.studentDept}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Zap key={i} className={`w-3 h-3 ${i < item.rating ? 'text-blue-600 fill-current' : 'text-slate-100'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="mb-4">
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-lg border border-slate-200">
                                                            {item.category}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                                                        "{item.comment || 'No detailed debrief provided.'}"
                                                    </p>
                                                    <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-4">
                                                        Captured: {item.submittedAt?.toDate?.() ? item.submittedAt.toDate().toLocaleString() : 'Just now'}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Export Configuration Modal */}
                {isExportModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsExportModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Premium Header */}
                            <div className="p-10 bg-slate-900 text-white relative overflow-hidden shrink-0">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -mr-48 -mt-48" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[80px] -ml-32 -mb-32" />

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/10">
                                            <Download className="w-8 h-8 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase italic tracking-tight mb-1">Export Matrix Configuration</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Operational Dimension Selection for {exportType} extraction</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsExportModalOpen(false)}
                                        className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/10 group"
                                    >
                                        <X className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                                    </button>
                                </div>
                            </div>

                            {/* Configuration Body */}
                            <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                                    {['Identity', 'Academic', 'Contact', 'Team', 'Strategic', 'Timeline', 'Admin'].map(category => (
                                        <div key={category} className="space-y-5">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-5 bg-blue-600 rounded-full" />
                                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{category} Infrastructure</h4>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{availableFields.filter(f => f.category === category).length} Nodes</span>
                                            </div>
                                            <div className="space-y-3">
                                                {availableFields.filter(f => f.category === category).map(field => (
                                                    <label key={field.id} className="flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl cursor-pointer hover:border-blue-300 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
                                                        {selectedFields.includes(field.id) && (
                                                            <motion.div layoutId={`bg-${field.id}`} className="absolute inset-0 bg-blue-50/50" />
                                                        )}
                                                        <div className="relative z-10 flex items-center gap-4 w-full">
                                                            <div className="relative flex items-center justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedFields.includes(field.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setSelectedFields([...selectedFields, field.id]);
                                                                        else setSelectedFields(selectedFields.filter(f => f !== field.id));
                                                                    }}
                                                                    className="w-6 h-6 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer accent-blue-600"
                                                                />
                                                            </div>
                                                            <span className={`text-[11px] font-black uppercase tracking-wide transition-colors ${selectedFields.includes(field.id) ? 'text-blue-600' : 'text-slate-600 group-hover:text-blue-500'}`}>
                                                                {field.label}
                                                            </span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary & Actions */}
                                <div className="space-y-8 pt-6">
                                    <div className="flex items-center gap-6 p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] group-hover:bg-blue-500/20 transition-all" />
                                        <div className="flex-1 space-y-2">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Selection Intelligence</p>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setSelectedFields(availableFields.map(f => f.id))}
                                                    className="px-6 py-2.5 bg-white/10 hover:bg-white text-[10px] font-black text-white hover:text-slate-900 uppercase tracking-widest rounded-xl transition-all border border-white/10"
                                                >
                                                    Full Extraction
                                                </button>
                                                <button
                                                    onClick={() => setSelectedFields(['name', 'roll'])}
                                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest rounded-xl transition-all border border-white/5"
                                                >
                                                    Core Essentials
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-right border-l border-white/10 pl-8">
                                            <h4 className="text-3xl font-black italic mb-1 text-blue-400">{selectedFields.length}</h4>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dimensions Active</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-6">
                                        <button
                                            onClick={() => setIsExportModalOpen(false)}
                                            className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all border border-slate-200"
                                        >
                                            Abort Extraction
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleDownloadSubReport(selectedEvent, exportType);
                                                setIsExportModalOpen(false);
                                            }}
                                            disabled={selectedFields.length === 0}
                                            className="flex-[2] py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.6)] hover:bg-blue-700 transition-all flex items-center justify-center gap-4 disabled:opacity-40 disabled:shadow-none"
                                        >
                                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                            <span>Generate Official Report</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrganizerDashboard;
