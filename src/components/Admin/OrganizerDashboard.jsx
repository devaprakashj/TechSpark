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

    // Registration Search & Filter State
    const [regSearchQuery, setRegSearchQuery] = useState('');
    const [regDeptFilter, setRegDeptFilter] = useState('all');
    const [regYearFilter, setRegYearFilter] = useState('all');

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
        coordinatorName: '',
        coordinatorPhone: '',
        coordinatorEmail: '',
        displayCoordinator: true,
        terms: '',
        acceptedTerms: false,
        internalNotes: ''
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
            if (eventList.length > 0) {
                const eventIds = eventList.map(e => e.id);
                const regsQuery = query(collection(db, 'registrations'));

                unsubscribeRegs = onSnapshot(regsQuery, (regSnapshot) => {
                    const filteredRegs = regSnapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(reg => eventIds.includes(reg.eventId));

                    setAllRegs(filteredRegs);
                    console.log(`Synced ${filteredRegs.length} total registrations across ${eventList.length} missions.`);
                });
            } else {
                setAllRegs([]);
            }
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
    }, [events, allRegs]);

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
            coordinatorName: event.coordinatorName || '',
            coordinatorPhone: event.coordinatorPhone || '',
            coordinatorEmail: event.coordinatorEmail || '',
            displayCoordinator: event.displayCoordinator !== false,
            terms: event.terms || '',
            acceptedTerms: false, // Reset for re-acceptance
            internalNotes: event.internalNotes || '',
            remarks: event.remarks || ''
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

    const handleViewDetails = async (event) => {
        setSelectedEvent(event);
        setLoadingRegs(true);
        // Reset filters when viewing new event
        setRegSearchQuery('');
        setRegDeptFilter('all');
        setRegYearFilter('all');
        try {
            const q = query(collection(db, 'registrations'), where('eventId', '==', event.id));
            const snapshot = await getDocs(q);
            setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching registrations:", error);
        } finally {
            setLoadingRegs(false);
        }
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

    const downloadPDFReport = async (event, regs) => {
        try {
            const doc = new jsPDF();
            const loadImage = (url) => new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });

            const [ritImg, tsImg] = await Promise.all([loadImage(ritLogo), loadImage(techsparkLogo)]);

            const centerX = 107.5; // (5mm sidebar + 210mm total width) / 2
            const ritWidth = 42;
            const tsWidth = 34;

            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 5, 297, 'F');
            doc.setFillColor(255, 255, 255);
            doc.rect(5, 0, 205, 60, 'F');

            if (ritImg) doc.addImage(ritImg, 'PNG', 18, 12, ritWidth, 36);
            if (tsImg) doc.addImage(tsImg, 'PNG', 210 - 18 - tsWidth, 12, tsWidth, 34);

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
            doc.text('REGISTER REPORT', centerX, 38, { align: 'center' });

            doc.setFillColor(15, 23, 42);
            doc.roundedRect(centerX - 55, 44, 110, 10, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(event.title.toUpperCase(), centerX, 50.5, { align: 'center' });
            doc.setDrawColor(226, 232, 240);
            doc.line(15, 65, 195, 65);

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('EVENT LOGISTICS:', 20, 75);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`DATE: ${event.date}`, 20, 83);
            doc.text(`VENUE: ${event.venue}`, 20, 88);
            doc.text(`TYPE: ${event.type}`, 20, 93);

            const tableData = regs.map((reg, index) => [
                { content: index + 1, styles: { fontStyle: 'bold' } },
                reg.studentName.toUpperCase(),
                reg.studentRoll || 'N/A',
                reg.studentDept || 'N/A',
                reg.studentYear || 'N/A',
                reg.studentSection || 'N/A',
                reg.studentPhone || 'N/A',
                reg.registeredAt?.toDate ? reg.registeredAt.toDate().toLocaleString() : 'N/A'
            ]);

            autoTable(doc, {
                startY: 105,
                head: [['#', 'STUDENT NAME', 'ROLL NO', 'DEPT', 'YEAR', 'SEC', 'PHONE', 'TIMESTAMP']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
                bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
                margin: { left: 15, right: 15 }
            });

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(`TRANSCRIPTION PAGE ${i} OF ${pageCount}`, centerX, 290, { align: 'center' });
                doc.text('TECHSPARK | INNOVATE • CREATE • IMPACT', 20, 290);
            }

            doc.save(`${event.title.replace(/\s+/g, '_')}_Master_Report.pdf`);
        } catch (error) {
            console.error("Report Gen Failure:", error);
        }
    };

    const downloadODReport = async (event, regs) => {
        try {
            const doc = new jsPDF();
            const reportId = `TS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const reportHash = `SHA256:${Math.random().toString(16).substr(2, 40)}`;

            const loadImage = (url) => new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });

            const [ritImg, tsImg] = await Promise.all([loadImage(ritLogo), loadImage(techsparkLogo)]);

            const centerX = 107.5;
            const ritWidth = 42;
            const tsWidth = 34;

            doc.setFillColor(16, 185, 129); // Emerald for OD
            doc.rect(0, 0, 5, 297, 'F');
            doc.setFillColor(255, 255, 255);
            doc.rect(5, 0, 205, 60, 'F');

            if (ritImg) doc.addImage(ritImg, 'PNG', 18, 12, ritWidth, 36);
            if (tsImg) doc.addImage(tsImg, 'PNG', 210 - 18 - tsWidth, 12, tsWidth, 34);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.text('TECHSPARK CLUB', centerX, 25, { align: 'center' });

            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'normal');
            doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', centerX, 31, { align: 'center' });

            doc.setTextColor(16, 185, 129);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('ATTENDEE REPORT', centerX, 38, { align: 'center' });

            doc.setFillColor(15, 23, 42);
            doc.roundedRect(centerX - 55, 44, 110, 10, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(event.title.toUpperCase(), centerX, 50.5, { align: 'center' });

            doc.setDrawColor(226, 232, 240);
            doc.line(15, 65, 195, 65);

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('MISSION INTEL:', 20, 75);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`OPERATION DATE: ${event.date}`, 20, 83);
            doc.text(`TERMINAL ID: T-CONSOLE-${event.id.substr(0, 6).toUpperCase()}`, 20, 88);
            doc.text(`REPORT ID: ${reportId}`, 20, 93);

            const tableData = regs.map((reg, index) => {
                const isPresent = reg.isAttended || reg.status === 'Present';
                return [
                    { content: index + 1, styles: { fontStyle: 'bold' } },
                    reg.studentName.toUpperCase(),
                    reg.studentRoll || 'N/A',
                    reg.studentDept || 'N/A',
                    reg.studentYear || 'N/A',
                    reg.studentSection || 'N/A',
                    reg.studentPhone || 'N/A',
                    isPresent ? (reg.checkedInAt?.toDate ? new Date(reg.checkedInAt.toDate()).toLocaleTimeString() : 'RECORDED') : '--:--',
                    {
                        content: isPresent ? 'PRESENT' : 'ABSENT',
                        styles: { textColor: isPresent ? [5, 150, 105] : [220, 38, 38], fontStyle: 'bold' }
                    }
                ];
            });

            autoTable(doc, {
                startY: 105,
                head: [['#', 'STUDENT NAME', 'ROLL NO', 'DEPT', 'YEAR', 'SEC', 'MOBILE', 'TIME', 'STATUS']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
                bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
                margin: { left: 15, right: 15 },
                didDrawPage: (data) => {
                    // Footer will be handled globally at the end
                }
            });

            let finalY = doc.lastAutoTable.finalY + 20;

            // Check if there is space for disclaimer and signature
            if (finalY > 230) {
                doc.addPage();
                finalY = 40;
            }

            // AUTHORITY & VALIDITY STATEMENT
            doc.setDrawColor(226, 232, 240);
            doc.line(20, finalY, 190, finalY);

            doc.setTextColor(100, 116, 139);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            const disclaimer = "This is a system-generated document and does not require a physical signature. This document is valid only after online verification through the official TechSpark verification portal.";
            const splitDisclaimer = doc.splitTextToSize(disclaimer, 140);
            doc.text(splitDisclaimer, 20, finalY + 10);

            // SIGNATORY SECTION
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Authorized By', 160, finalY + 25, { align: 'right' });
            doc.setFontSize(10);
            doc.text('TechSpark Club', 160, finalY + 30, { align: 'right' });
            doc.setFontSize(8);
            doc.text('Rajalakshmi Institute of Technology', 160, finalY + 34, { align: 'right' });

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);

                // Left-aligned system info
                doc.text(`REPORT HASH: ${reportHash}`, 20, 285);
                doc.text(`VERIFICATION ID: ${reportId}`, 20, 290);

                // Center-aligned system name
                doc.text('Generated using TechSpark Official Attendance & Certification System', centerX, 290, { align: 'center' });

                // Right-aligned page number
                doc.text(`PAGE ${i} OF ${pageCount}`, 190, 290, { align: 'right' });
            }

            doc.save(`${event.title.replace(/\s+/g, '_')}_Attendee_Report.pdf`);
        } catch (error) {
            console.error("OD Report Gen Failure:", error);
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
                                                    onClick={() => downloadPDFReport(selectedEvent, registrations)}
                                                    disabled={registrations.length === 0}
                                                    className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl shadow-slate-900/10 hover:bg-black transition-all flex items-center gap-2 uppercase tracking-widest disabled:opacity-30"
                                                >
                                                    <FileText className="w-5 h-5" /> Register Report
                                                </button>
                                                <button
                                                    onClick={() => downloadODReport(selectedEvent, registrations)}
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
                                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                            <span className="text-blue-600">{reg.studentRoll}</span>
                                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                            <span>{reg.studentDept}</span>
                                                                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                            <span>{reg.studentYear} Year</span>
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
                                                    <p className="text-xs text-blue-600 font-medium">Drafting essential operation parameters</p>
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
                                    {activeStep === 3 && (activeStep === 3) && (
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
                                                                        {['CSE', 'IT', 'AI-DS', 'AI-ML', 'ECE', 'EEE', 'MECH', 'CIVIL'].map(dept => (
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
                                                                    <div className="flex gap-3">
                                                                        {['I', 'II', 'III', 'IV'].map(year => (
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
                                                                        {['A', 'B', 'C', 'D'].map(sec => (
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
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[10px] font-black uppercase tracking-widest">Entry Registration</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFormData({ ...formData, registrationRequired: !formData.registrationRequired })}
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.registrationRequired ? 'bg-blue-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.registrationRequired ? 'right-1' : 'left-1'}`} />
                                                                </button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Max Deployment Units (Participants)</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="100"
                                                                    value={formData.maxParticipants}
                                                                    onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                                                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl font-black text-sm text-white outline-none"
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[10px] font-black uppercase tracking-widest">Enable Awaiting List</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFormData({ ...formData, waitingList: !formData.waitingList })}
                                                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.waitingList ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.waitingList ? 'right-1' : 'left-1'}`} />
                                                                </button>
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
            </AnimatePresence>
        </div>
    );
};

export default OrganizerDashboard;
