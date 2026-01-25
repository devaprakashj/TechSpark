import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Calendar,
    Settings,
    LogOut,
    Search,
    ShieldCheck,
    Plus,
    QrCode,
    TrendingUp,
    Award,
    CheckCircle,
    X,
    LayoutDashboard,
    UserCog,
    Shield,
    Key,
    BarChart3,
    ClipboardList,
    ShieldAlert,
    PieChart,
    ArrowRight,
    Download,
    Filter,
    Trash2,
    CalendarCheck,
    Briefcase,
    ExternalLink,
    Info,
    RefreshCw,
    AlertCircle,
    Activity,
    Terminal,
    RotateCcw,
    ChevronRight,
    HelpCircle,
    Clock,
    MapPin,
    UserCheck,
    FileText,
    Bell
} from 'lucide-react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, where, updateDoc, doc, increment, deleteDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Scanner } from '@yudiel/react-qr-scanner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import emailjs from '@emailjs/browser';
import ritLogo from '../../assets/rit-logo.png';
import techsparkLogo from '../../assets/techspark-logo.png';

const AdminDashboard = () => {
    const [admin, setAdmin] = useState(null);
    const [students, setStudents] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({
        totalMembers: 0,
        activeEvents: 0,
        totalXP: 0,
        totalBadges: 0
    });
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [isScanning, setIsScanning] = useState(true);
    const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success' | 'error' | 'loading', message: string, student?: object }
    const [manualRollNumber, setManualRollNumber] = useState('');
    const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);

    // Organizer Management State
    const [organizers, setOrganizers] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [feedbackBase, setFeedbackBase] = useState([]);
    const [selectedEventDetails, setSelectedEventDetails] = useState(null);
    const [showEventDetailModal, setShowEventDetailModal] = useState(false);
    const [securityLogs, setSecurityLogs] = useState([]);
    const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
    const [newOrg, setNewOrg] = useState({
        fullName: '',
        username: '',
        password: '',
        email: '',
        phone: '',
        department: '',
        role: 'Event Organizer',
        status: 'Active'
    });
    const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);
    const [analytics, setAnalytics] = useState({
        deptWise: {},
        yearWise: {},
        batchWise: {},
        sectionWise: {}
    });

    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Certificate Verification API URL
    const [certApiUrl, setCertApiUrl] = useState(
        localStorage.getItem('certApiUrl') || 'https://script.google.com/macros/s/AKfycbxZvWwaHjkFrS_yK3akleByW1FtmnWu7ht-UYt6ztPbTTnWUuGUmhjZ_HsOWdu5aHruFw/exec'
    );
    const [isTestingApi, setIsTestingApi] = useState(false);
    // Student Management State
    const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
    const [isManageStudentModalOpen, setIsManageStudentModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [selectedStudentHistory, setSelectedStudentHistory] = useState([]);
    const [eventStatusFilter, setEventStatusFilter] = useState('ALL');
    const [eventSearchQuery, setEventSearchQuery] = useState('');
    const [isSearchScannerOpen, setIsSearchScannerOpen] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [eventToApprove, setEventToApprove] = useState(null);

    // Student Analytics Filters
    const [studentFilterDept, setStudentFilterDept] = useState('ALL');
    const [studentFilterYear, setStudentFilterYear] = useState('ALL');
    const [studentFilterBatch, setStudentFilterBatch] = useState('ALL');

    // Quiz Settings Modal State
    const [showQuizSettingsModal, setShowQuizSettingsModal] = useState(false);
    const [quizSettingsEvent, setQuizSettingsEvent] = useState(null);
    const [quizSettings, setQuizSettings] = useState({
        quizFormUrl: '',
        quizEntryName: '',
        quizEntryRoll: '',
        quizEntryDept: '',
        quizEntryYear: '',
        quizEntrySection: '',
        quizEntryMobile: ''
    });
    const [savingQuizSettings, setSavingQuizSettings] = useState(false);
    const [isEditEventOrganizerModalOpen, setIsEditEventOrganizerModalOpen] = useState(false);
    const [eventToEditOrganizer, setEventToEditOrganizer] = useState(null);
    const [selectedNewOrganizer, setSelectedNewOrganizer] = useState('');
    const [isReassigning, setIsReassigning] = useState(false);

    const fetchDashboardData = () => {
        console.log("Strategic Refresh Triggered");
        // Real-time sync is active via initDashboardSync, no manual fetch required
    };

    // Dynamic extraction helper for missing student data
    const getStudentExtendedData = (s) => {
        let year = s.yearOfStudy || 'Unknown';
        let admissionYear = s.admissionYear || 'Unknown';
        let dept = s.department || 'Unknown';

        // Auto-extract from email if data is missing or "Unknown"
        if ((year === 'Unknown' || admissionYear === 'Unknown' || dept === 'Unknown') && s.email) {
            try {
                const email = s.email.toLowerCase();
                const [local, domain] = email.split('@');
                const domainSegments = domain.split('.');

                // 1. Aggressive Admission Year Detection
                if (admissionYear === 'Unknown') {
                    // Try to find a 4-digit year (e.g. 2023)
                    const yearMatch4 = local.match(/(20[1-2][0-9])/);
                    if (yearMatch4) {
                        admissionYear = parseInt(yearMatch4[0]);
                    } else {
                        // Try to find a 2-digit roll number prefix (e.g. 21, 22, 23, 24)
                        // Looking for a sequence of 6+ digits
                        const digitMatch = local.match(/(\d{6,12})/);
                        const roll = digitMatch ? digitMatch[0] : (s.rollNumber || '');
                        if (roll && roll.length >= 6) {
                            const prefix = roll.substring(0, 2);
                            if (parseInt(prefix) >= 15 && parseInt(prefix) <= 30) {
                                admissionYear = 2000 + parseInt(prefix);
                            }
                        }
                    }
                }

                // 2. Aggressive Department Detection
                if (dept === 'Unknown') {
                    // Check subdomain first
                    if (domainSegments.length === 4 && domainSegments[1] === 'ritchennai') {
                        dept = domainSegments[0].toUpperCase();
                    } else {
                        // Check for common department codes in local part
                        const deptCodes = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSBS', 'BME', 'RA', 'FT'];
                        for (const code of deptCodes) {
                            if (local.toUpperCase().includes(code)) {
                                dept = code;
                                break;
                            }
                        }
                    }
                }

                // 3. Recalculate Year of Study if admission year was found
                if (admissionYear !== 'Unknown' && (year === 'Unknown' || !year)) {
                    const now = new Date();
                    const academicYearRef = (now.getMonth() + 1) < 6 ? now.getFullYear() - 1 : now.getFullYear();
                    const calc = academicYearRef - parseInt(admissionYear) + 1;
                    if (calc > 0 && calc <= 4) year = calc.toString();
                    else if (calc > 4) year = 'Alumni';
                    else if (calc <= 0) year = '1'; // Default for future/incoming
                }
            } catch (e) {
                console.error("Meta extraction failed for", s.email, e);
            }
        }

        const batch = (admissionYear && admissionYear !== 'Unknown')
            ? `${admissionYear}-${parseInt(admissionYear) + 4}`
            : 'Unknown';

        return { year, batch, dept, admissionYear };
    };

    const navigate = useNavigate();

    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            navigate('/admin/login');
            return;
        }
        setAdmin(JSON.parse(adminToken));

        // Initialize Real-time Sync
        const cleanup = initDashboardSync();
        return () => {
            if (cleanup) cleanup();
        };
    }, []);

    // Reactive Analytics & Stats Calculation
    useEffect(() => {
        if (allStudents.length === 0) return;

        // Calculate Totals
        let totalXP = 0;
        let totalBadges = 0;
        const deptMap = {};
        const yearMap = {};
        const batchMap = {};
        const sectionMap = {};

        allStudents.forEach(s => {
            totalXP += (s.points || 0);
            totalBadges += (s.badges?.length || 0);

            const { year, batch, dept } = getStudentExtendedData(s);

            deptMap[dept] = (deptMap[dept] || 0) + 1;
            yearMap[year] = (yearMap[year] || 0) + 1;
            batchMap[batch] = (batchMap[batch] || 0) + 1;
            sectionMap[s.section || 'Unknown'] = (sectionMap[s.section || 'Unknown'] || 0) + 1;
        });

        setStats({
            totalMembers: allStudents.length,
            activeEvents: events.length,
            totalXP: totalXP,
            totalBadges: totalBadges
        });

        setAnalytics({
            deptWise: deptMap,
            yearWise: yearMap,
            batchWise: batchMap,
            sectionWise: sectionMap
        });

        // Update active students list (top 10 for overview)
        setStudents(allStudents.slice(0, 10));

    }, [allStudents, events]);

    const downloadEventImpactReport = async () => {
        try {
            const doc = new jsPDF();
            const reportId = `TS-IMP-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;

            // Image Loading logic
            const loadImg = (path) => new Promise(res => {
                const img = new Image();
                img.onload = () => res(img);
                img.src = path;
            });

            const [rit, ts] = await Promise.all([loadImg(ritLogo), loadImg(techsparkLogo)]);

            // Header Section
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, 210, 65, 'F');
            doc.addImage(rit, 'PNG', 15, 15, 42, 36);
            doc.addImage(ts, 'PNG', 161, 16, 34, 34);

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('STRATEGIC IMPACT STUDY', 105, 30, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`REPORT ID: ${reportId}`, 105, 40, { align: 'center' });
            doc.setDrawColor(226, 232, 240);
            doc.line(15, 55, 195, 55);

            // Report Scope
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.text('OPERATIONAL SUMMARY', 15, 75);

            const liveEvents = events.filter(e => e.status === 'LIVE').length;
            const completedEvents = events.filter(e => e.status === 'COMPLETED').length;

            const summaryData = [
                ['Total Missions Initiated', events.length.toString()],
                ['Active Operations (LIVE)', liveEvents.toString()],
                ['Completed Operations', completedEvents.toString()],
                ['Global Participant Base', registrations.length.toString()],
                ['Avg. Impact per Mission', (events.length ? (registrations.length / events.length).toFixed(1) : '0')]
            ];

            autoTable(doc, {
                startY: 85,
                body: summaryData,
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 5 },
                columnStyles: { 0: { fontStyle: 'bold', textColor: [71, 85, 105] }, 1: { halign: 'right', fontStyle: 'bold' } }
            });

            // Detailed Event Breakdown
            doc.text('MISSION PERFORMANCE METRICS', 15, doc.lastAutoTable.finalY + 20);

            const tableData = events.map(e => [
                e.title.toUpperCase(),
                e.type,
                e.createdBy,
                e.status,
                e.attendeesCount || 0
            ]);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 25,
                head: [['MISSION TITLE', 'SEGMENT', 'LEAD', 'STATUS', 'REGS']],
                body: tableData,
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            doc.save(`TechSpark_Impact_Study_${reportId}.pdf`);
        } catch (error) {
            console.error("PDF Export Failure:", error);
            alert("Report terminal encountered an error.");
        }
    };

    const downloadDemographicReport = async () => {
        try {
            const doc = new jsPDF();
            const reportId = `TS-DEM-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
            const [rit, ts] = await Promise.all([
                new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = ritLogo; }),
                new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = techsparkLogo; })
            ]);

            doc.addImage(rit, 'PNG', 15, 15, 42, 36);
            doc.addImage(ts, 'PNG', 161, 16, 34, 34);
            doc.setFontSize(20).setFont('helvetica', 'bold').text('MEMBER DEMOGRAPHIC AUDIT', 105, 30, { align: 'center' });
            doc.setFontSize(9).setTextColor(100).text(`Generated: ${new Date().toLocaleString()} | ID: ${reportId}`, 105, 40, { align: 'center' });
            doc.line(15, 55, 195, 55);

            // Dept Distribution
            doc.setTextColor(30).setFontSize(12).text('DEPARTMENTAL CONCENTRATION', 15, 75);
            const deptData = Object.entries(analytics.deptWise).sort((a, b) => b[1] - a[1]);
            autoTable(doc, {
                startY: 85,
                head: [['DEPARTMENT', 'MEMBER COUNT', 'PERCENTAGE']],
                body: deptData.map(([dept, count]) => [
                    dept,
                    count,
                    `${((count / allStudents.length) * 100).toFixed(1)}%`
                ]),
                headStyles: { fillColor: [37, 99, 235] }
            });

            // Year Distribution
            doc.text('ACADEMIC YEAR SEGMENTATION', 15, doc.lastAutoTable.finalY + 15);
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['YEAR OF STUDY', 'TOTAL MEMBERS']],
                body: Object.entries(analytics.yearWise).sort(),
                headStyles: { fillColor: [79, 70, 229] }
            });

            doc.save(`TechSpark_Demographics_${reportId}.pdf`);
        } catch (error) { console.error(error); alert("Demographic Export error"); }
    };

    const downloadOperationalAuditReport = async () => {
        try {
            const doc = new jsPDF();
            const reportId = `TS-AUD-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
            const [rit, ts] = await Promise.all([
                new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = ritLogo; }),
                new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = techsparkLogo; })
            ]);

            doc.addImage(rit, 'PNG', 15, 15, 42, 36);
            doc.addImage(ts, 'PNG', 161, 16, 34, 34);
            doc.setFontSize(22).setFont('helvetica', 'bold').text('OPERATIONAL LOGISTICS AUDIT', 105, 30, { align: 'center' });
            doc.setFontSize(10).setTextColor(120).text('STRATEGIC OVERSIGHT & GOVERNANCE REPORT', 105, 40, { align: 'center' });
            doc.line(15, 55, 195, 55);

            // Organizer List
            doc.setTextColor(30).setFontSize(12).text('COMMISSIONED ORGANIZER ROSTER', 15, 75);
            autoTable(doc, {
                startY: 85,
                head: [['IDENTIFIER', 'DESIGNATION', 'DEPARTMENT', 'CONTACT']],
                body: organizers.map(o => [o.fullName.toUpperCase(), o.role || 'ORGANIZER', o.department, o.email]),
                headStyles: { fillColor: [15, 23, 42] }
            });

            // Approval History (Overview)
            doc.text('STRATEGIC APPROVAL STATUS', 15, doc.lastAutoTable.finalY + 15);
            const statusCounts = events.reduce((acc, e) => {
                acc[e.status] = (acc[e.status] || 0) + 1;
                return acc;
            }, {});

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['STATUS SEGMENT', 'QUANTITY']],
                body: Object.entries(statusCounts),
                bodyStyles: { fontStyle: 'bold' }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8).setTextColor(150);
                doc.text('This document is a tactical internal audit of the TechSpark Club system. Confidentiality is paramount.', 105, 285, { align: 'center' });
            }

            doc.save(`TechSpark_Operational_Audit_${reportId}.pdf`);
        } catch (error) { console.error(error); alert("Audit report failed."); }
    };

    const handleTestApi = async () => {
        setIsTestingApi(true);
        setApiTestMessage(null);
        try {
            const baseUrl = certApiUrl.trim();
            const separator = baseUrl.includes('?') ? '&' : '?';
            const finalUrl = `${baseUrl}${separator}count=true`;
            const response = await fetch(finalUrl, { method: 'GET', mode: 'cors' });
            const text = await response.text();
            if (response.ok && !isNaN(parseInt(text))) {
                setApiTestMessage({ type: 'success', text: `Connection Successful! Found ${text} records in database.` });
            } else {
                setApiTestMessage({ type: 'error', text: `Connected but invalid response: ${text.substring(0, 50)}...` });
            }
        } catch (err) {
            setApiTestMessage({ type: 'error', text: `Connection Failed: ${err.message}` });
        } finally {
            setIsTestingApi(false);
        }
    };

    const initDashboardSync = () => {
        setLoadingData(true);
        console.log("Initializing Admin Synchronizer...");

        // 1. Listen to Students
        const studentsQuery = query(collection(db, 'users'), orderBy('fullName', 'asc'));
        const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
            const studentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllStudents(studentList);
            setLoadingData(false);
        }, (err) => {
            console.error("Student Sync Error:", err);
            setLoadingData(false);
        });

        // 2. Listen to Events
        const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
            const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEvents(eventList);
        });

        // 3. Listen to Organizers
        const unsubscribeOrganizers = onSnapshot(collection(db, 'organizers'), (snapshot) => {
            const organizersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrganizers(organizersList);
        });

        // 4. Listen to Registrations
        const unsubscribeRegs = onSnapshot(collection(db, 'registrations'), (snapshot) => {
            const regsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRegistrations(regsList);
        });

        // 5. Listen to Feedback
        const unsubscribeFeedback = onSnapshot(collection(db, 'feedback'), (snapshot) => {
            const feedbackList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFeedbackBase(feedbackList);
        });

        // 6. Listen to Security Logs
        const unsubscribeSecurity = onSnapshot(query(collection(db, 'security_logs'), orderBy('timestamp', 'desc')), (snapshot) => {
            const logsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSecurityLogs(logsList);
        });

        // 7. Listen to Quiz Submissions
        const unsubscribeSubmissions = onSnapshot(query(collection(db, 'quizSubmissions'), orderBy('timestamp', 'desc')), (snapshot) => {
            const subsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(subsList);
        });

        return () => {
            unsubscribeStudents();
            unsubscribeEvents();
            unsubscribeOrganizers();
            unsubscribeRegs();
            unsubscribeFeedback();
            unsubscribeSecurity();
            unsubscribeSubmissions();
        };
    };

    // Success beep sound
    const playSuccessBeep = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            console.log('Audio not supported');
        }
    };

    const handleSearchScan = async (result) => {
        const val = result[0]?.rawValue;
        if (val) {
            // Check if QR contains college ID verification URL
            if (val.includes('ims.ritchennai.edu.in') || val.includes('http')) {
                // ✅ Play success beep and close scanner
                playSuccessBeep();
                setIsSearchScannerOpen(false);

                await processSearchQRUrl(val);
            } else {
                playSuccessBeep();
                setSearchQuery(val);
                setIsSearchScannerOpen(false);
            }
        }
    };

    const processSearchQRUrl = async (url) => {
        try {
            console.log('✅ Processing Search QR URL:', url);

            // Fetch verification page
            let response;
            try {
                response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    headers: { 'Accept': 'text/html' }
                });
            } catch (corsError) {
                console.log('Direct fetch failed, using CORS proxy...');
                const proxyUrl = 'https://api.allorigins.win/raw?url=';
                response = await fetch(proxyUrl + encodeURIComponent(url));
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const html = await response.text();

            // Extract roll number using multiple patterns
            const patterns = [
                /Register Number[:\s]*(\d+)/i,
                /Registration Number[:\s]*(\d+)/i,
                /Roll Number[:\s]*(\d+)/i,
                /Roll No[:\s.]*(\d+)/i,
                /Reg\.?\s*No\.?[:\s]*(\d+)/i,
                /<td[^>]*>(\d{10,15})<\/td>/i,
            ];

            let rollNumber = null;
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    rollNumber = match[1];
                    console.log('✅ Extracted Roll Number:', rollNumber);
                    break;
                }
            }

            if (rollNumber) {
                setSearchQuery(rollNumber);
            } else {
                throw new Error('Could not extract roll number');
            }
        } catch (error) {
            console.error('Search QR URL Error:', error);
            alert('Failed to process QR code. Please try again or enter manually.');
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualRollNumber) return;
        await processRollNumber(manualRollNumber);
        setManualRollNumber('');
        setIsManualEntryOpen(false);
    };

    const processRollNumber = async (rollNumber) => {
        setIsScanning(false);
        setScanFeedback({ type: 'loading', message: `Verifying ${rollNumber}...` });

        try {
            const q = query(collection(db, 'users'), where('rollNumber', '==', rollNumber));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setScanFeedback({ type: 'error', message: `Student with ID ${rollNumber} not found.` });
                setTimeout(() => {
                    setIsScanning(true);
                    setScanFeedback(null);
                }, 3000);
                return;
            }

            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();

            await updateDoc(doc(db, 'users', studentDoc.id), {
                points: increment(20),
                participationCount: increment(1)
            });

            await addDoc(collection(db, 'activities'), {
                userId: studentDoc.id,
                userName: studentData.fullName,
                type: 'QR_SCAN',
                description: 'Attended a live interaction/event',
                xpEarned: 20,
                timestamp: serverTimestamp()
            });

            setScanFeedback({
                type: 'success',
                message: 'Attendance Marked!',
                student: studentData
            });

            setTimeout(() => {
                setIsScanning(true);
                setScanFeedback(null);
            }, 5000);

        } catch (error) {
            console.error("Scan error:", error);
            setScanFeedback({ type: 'error', message: 'Failed to process request.' });
            setTimeout(() => {
                setIsScanning(true);
                setScanFeedback(null);
            }, 3000);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    };

    const handleCreateOrganizer = async (e) => {
        e.preventDefault();
        setIsSubmittingOrg(true);
        try {
            const orgData = {
                fullName: newOrg.fullName.trim(),
                username: newOrg.username.trim(),
                password: newOrg.password.trim(),
                email: newOrg.email.trim(),
                phone: newOrg.phone.trim(),
                department: newOrg.department,
                role: newOrg.role,
                status: 'Active',
                createdAt: serverTimestamp(),
                createdBy: admin.username
            };

            await addDoc(collection(db, 'organizers'), orgData);
            setIsOrgModalOpen(false);
            setNewOrg({
                fullName: '',
                username: '',
                password: '',
                email: '',
                phone: '',
                department: '',
                role: 'Event Organizer',
                status: 'Active'
            });
            fetchDashboardData();
            alert("Organizer created successfully! 👷‍♂️✅");
        } catch (error) {
            console.error("Error creating organizer:", error);
            alert("Failed to create organizer.");
        } finally {
            setIsSubmittingOrg(false);
        }
    };

    const handleDeleteOrganizer = async (id) => {
        if (!window.confirm("Remove this organizer?")) return;
        try {
            await deleteDoc(doc(db, 'organizers', id));
            fetchDashboardData();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm('⚠️ WARNING: This will permanently delete the event and ALL associated registrations and feedback. Are you sure?')) return;

        try {
            // Delete the event
            await deleteDoc(doc(db, 'events', eventId));

            // Delete all registrations for this event
            const regsQuery = query(collection(db, 'registrations'), where('eventId', '==', eventId));
            const regsSnapshot = await getDocs(regsQuery);
            const deleteRegsPromises = regsSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deleteRegsPromises);

            // Delete all feedback for this event
            const feedbackQuery = query(collection(db, 'feedback'), where('eventId', '==', eventId));
            const feedbackSnapshot = await getDocs(feedbackQuery);
            const deleteFeedbackPromises = feedbackSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deleteFeedbackPromises);

            alert(`✅ Event deleted successfully!\n- Event removed\n- ${regsSnapshot.size} registrations deleted\n- ${feedbackSnapshot.size} feedback entries deleted`);
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('❌ Failed to delete event. Please try again.');
        }
    };

    const handleOpenEditOrganizer = (event) => {
        setEventToEditOrganizer(event);
        setSelectedNewOrganizer(event.createdBy || '');
        setIsEditEventOrganizerModalOpen(true);
    };

    const handleUpdateOrganizer = async () => {
        if (!eventToEditOrganizer || !selectedNewOrganizer) return;
        setIsReassigning(true);

        try {
            const eventRef = doc(db, 'events', eventToEditOrganizer.id);
            await updateDoc(eventRef, {
                createdBy: selectedNewOrganizer
            });

            // Log the action
            await addDoc(collection(db, 'security_logs'), {
                action: 'UPDATE_EVENT_ORGANIZER',
                target: eventToEditOrganizer.title,
                executedBy: admin?.username || 'Admin',
                timestamp: serverTimestamp(),
                details: `Changed organizer from ${eventToEditOrganizer.createdBy} to ${selectedNewOrganizer}`,
                status: 'SUCCESS'
            });

            // Update selectedEventDetails if open to reflect change immediately
            if (selectedEventDetails && selectedEventDetails.id === eventToEditOrganizer.id) {
                setSelectedEventDetails({ ...selectedEventDetails, createdBy: selectedNewOrganizer });
            }

            alert(`Mission Command reassigned to ${selectedNewOrganizer} successfully! 🎯`);
            setIsEditEventOrganizerModalOpen(false);
            setEventToEditOrganizer(null);
        } catch (error) {
            console.error("Organizer reassignment failed:", error);
            alert("Error in strategic reassignment.");
        } finally {
            setIsReassigning(false);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm("Are you sure you want to remove this member? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'users', studentId));
            fetchDashboardData();
        } catch (error) {
            console.error("Error deleting student:", error);
            alert("Failed to remove member.");
        }
    };

    // Quiz Settings Handlers
    const handleOpenQuizSettings = (event) => {
        setQuizSettingsEvent(event);
        setQuizSettings({
            quizFormUrl: event.quizFormUrl || '',
            quizEntryName: event.quizEntryName || '',
            quizEntryRoll: event.quizEntryRoll || '',
            quizEntryDept: event.quizEntryDept || '',
            quizEntryYear: event.quizEntryYear || '',
            quizEntrySection: event.quizEntrySection || '',
            quizEntryMobile: event.quizEntryMobile || ''
        });
        setShowQuizSettingsModal(true);
    };

    const handleSaveQuizSettings = async () => {
        if (!quizSettingsEvent) return;
        setSavingQuizSettings(true);
        try {
            await updateDoc(doc(db, 'events', quizSettingsEvent.id), {
                quizFormUrl: quizSettings.quizFormUrl,
                quizEntryName: quizSettings.quizEntryName,
                quizEntryRoll: quizSettings.quizEntryRoll,
                quizEntryDept: quizSettings.quizEntryDept,
                quizEntryYear: quizSettings.quizEntryYear,
                quizEntrySection: quizSettings.quizEntrySection,
                quizEntryMobile: quizSettings.quizEntryMobile,
                type: 'Quiz' // Ensure type is Quiz
            });
            alert('✅ Quiz settings saved successfully!');
            setShowQuizSettingsModal(false);
            setQuizSettingsEvent(null);
        } catch (error) {
            console.error('Error saving quiz settings:', error);
            alert('❌ Failed to save quiz settings');
        } finally {
            setSavingQuizSettings(false);
        }
    };

    // Revert COMPLETED event back to LIVE
    const handleRevertToLive = async (eventId, eventTitle) => {
        if (!window.confirm(`⚠️ REVERT TO LIVE: Are you sure you want to revert "${eventTitle}" from COMPLETED back to LIVE? This will make the event active again.`)) return;

        try {
            await updateDoc(doc(db, 'events', eventId), {
                status: 'LIVE',
                completedAt: null,
                revertedToLiveAt: serverTimestamp(),
                revertedBy: admin?.username || 'Admin'
            });
            alert(`✅ Event "${eventTitle}" has been reverted to LIVE status!`);
        } catch (error) {
            console.error('Error reverting event:', error);
            alert('❌ Failed to revert event to LIVE status');
        }
    };

    const handleEditStudent = (student) => {
        setEditingStudent({ ...student });
        setIsEditStudentModalOpen(true);
    };

    const handleSaveStudent = async (e) => {
        e.preventDefault();
        if (!editingStudent) return;
        try {
            const studentRef = doc(db, 'users', editingStudent.id);
            const updateData = {
                fullName: editingStudent.fullName,
                rollNumber: editingStudent.rollNumber,
                department: editingStudent.department,
                yearOfStudy: editingStudent.yearOfStudy,
                email: editingStudent.email,
                section: editingStudent.section || 'A',
                admissionYear: editingStudent.admissionYear || new Date().getFullYear().toString()
            };
            await updateDoc(studentRef, updateData);
            setIsEditStudentModalOpen(false);
            setEditingStudent(null);
            alert("Member profile updated successfully! 📂✅");
        } catch (error) {
            console.error("Error updating student:", error);
            alert("Failed to update member profile.");
        }
    };

    const handleManageStudent = (student) => {
        const history = registrations.filter(r => r.studentRoll === student.rollNumber).map(r => {
            const event = events.find(e => e.id === r.eventId);
            return {
                ...r,
                eventTitle: event?.title || 'Unknown Mission',
                eventDate: event?.date || 'N/A'
            };
        });
        setSelectedStudentHistory(history);
        setEditingStudent(student);
        setIsManageStudentModalOpen(true);
    };

    const handleUndoFeedback = async (regId, feedbackId) => {
        if (!window.confirm("STRATEGIC OVERRIDE: UNDO FEEDBACK SUBMISSION? This will revert the student's status and allow re-submission.")) return;
        try {
            await updateDoc(doc(db, 'registrations', regId), {
                feedbackSubmitted: false,
                status: 'Present',
                eligibleForCertificate: false
            });
            if (feedbackId) {
                await deleteDoc(doc(db, 'feedback', feedbackId));
            }
        } catch (error) {
            console.error("Error undoing feedback:", error);
            alert("Operation failed. Manual override required.");
        }
    };

    const formatValue = (val) => {
        if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
        return val;
    };

    const filteredStudents = allStudents.filter(student => {
        const query = (searchQuery || '').toLowerCase();
        const { year, batch, dept } = getStudentExtendedData(student);

        const matchesSearch = (
            (student.fullName || '').toLowerCase().includes(query) ||
            (student.rollNumber || '').toLowerCase().includes(query) ||
            (dept || '').toLowerCase().includes(query) ||
            (student.email || '').toLowerCase().includes(query)
        );

        const matchesDept = studentFilterDept === 'ALL' || dept === studentFilterDept;
        const matchesYear = studentFilterYear === 'ALL' || year === studentFilterYear || student.yearOfStudy === studentFilterYear;
        const matchesBatch = studentFilterBatch === 'ALL' || batch === studentFilterBatch;

        return matchesSearch && matchesDept && matchesYear && matchesBatch;
    });

    const filteredEventsRegistry = (events || []).filter(event => {
        const query = (eventSearchQuery || '').toLowerCase();
        const matchesStatus = eventStatusFilter === 'ALL' || event.status === eventStatusFilter;
        const matchesSearch = (event.title || '').toLowerCase().includes(query) ||
            (event.type || '').toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
    });

    const handleDownloadFinalReport = async (event) => {
        if (!event) return;
        console.log("INITIATING MASTER REPORT ASSEMBLY...", event.title);
        const eventRegs = registrations.filter(r => r.eventId === event.id);
        const eventFeedback = feedbackBase.filter(f => f.eventId === event.id);
        const presentCount = eventRegs.filter(r => r.isAttended || r.status === 'Present').length;
        const absentCount = eventRegs.length - presentCount;
        const attendanceRate = ((presentCount / (eventRegs.length || 1)) * 100).toFixed(1);

        // helper for analysis
        const getAnalysis = (data) => {
            const depts = {}, years = {};
            data.forEach(r => {
                depts[r.studentDept] = (depts[r.studentDept] || 0) + 1;
                years[r.studentYear] = (years[r.studentYear] || 0) + 1;
            });
            return { depts, years };
        };

        const analysis = getAnalysis(eventRegs);
        const topDept = Object.entries(analysis.depts).sort((a, b) => b[1] - a[1])[0];
        const topYear = Object.entries(analysis.years).sort((a, b) => b[1] - a[1])[0];
        const avgRating = (eventFeedback.reduce((acc, curr) => acc + (curr.rating || 0), 0) / (eventFeedback.length || 1)).toFixed(1);

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const reportId = `TS-MASTER-${event.id.slice(0, 5).toUpperCase()}-${Math.floor(Date.now() / 10000)}`;

            const drawBranding = () => {
                doc.setFillColor(15, 23, 42); // Navy Dark
                doc.rect(0, 0, 5, pageHeight, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.line(10, 25, pageWidth - 10, 25);
            };

            const addLogos = async () => {
                const loadImg = (path) => new Promise(res => {
                    const img = new Image();
                    img.onload = () => res(img);
                    img.onerror = () => res(null);
                    img.src = path;
                });
                const [rit, ts] = await Promise.all([loadImg(ritLogo), loadImg(techsparkLogo)]);
                if (rit) doc.addImage(rit, 'PNG', 10, 8, 45, 12);
                if (ts) doc.addImage(ts, 'PNG', pageWidth - 55, 8, 45, 12);
            };

            const addWatermark = (text = 'OFFICIAL AUDIT') => {
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.03 }));
                doc.setFontSize(40);
                doc.setTextColor(150);
                doc.setFont('helvetica', 'bold');
                doc.text(text, pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                doc.restoreGraphicsState();
            };

            const addPageFooter = (pageNum) => {
                doc.setFontSize(7);
                doc.setTextColor(160);
                doc.text(`CONFIDENTIAL MASTER REPORT | ID: ${reportId} | PAGE ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            };

            await addLogos();
            drawBranding();

            // --- PAGE 1: COVER PAGE ---
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(36);
            doc.text('STRATEGIC', pageWidth / 2, 85, { align: 'center' });
            doc.text('MISSION DOSSIER', pageWidth / 2, 100, { align: 'center' });

            doc.setFillColor(37, 99, 235);
            doc.rect(pageWidth / 2 - 50, 110, 100, 3, 'F');

            doc.setFontSize(20);
            doc.setTextColor(51, 65, 85);
            doc.text(event.title.toUpperCase(), pageWidth / 2, 135, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`MISSION DATE: ${event.date} | VENUE: ${event.venue || 'CAMPUS HUB'}`, pageWidth / 2, 145, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 99, 235);
            doc.text('AUTHORIZED BY TECHSPARK CLUB CORE ADMINISTRATION', pageWidth / 2, 170, { align: 'center' });

            addPageFooter(1);

            // --- PAGE 2: EXECUTIVE INTELLIGENCE SUMMARY ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('EXECUTIVE SUMMARY');

            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text('SECTION II: EXECUTIVE INTELLIGENCE SUMMARY', 15, 45);

            autoTable(doc, {
                startY: 55,
                body: [
                    ['TOTAL REGISTERED AGENTS', eventRegs.length.toString()],
                    ['OPERATIONAL ATTENDANCE', presentCount.toString()],
                    ['ATTENDANCE EFFICIENCY', `${attendanceRate}%`],
                    ['DIVERSITY INDEX', `${Object.keys(analysis.depts).length} DEPTS REPRESENTED`],
                    ['STRATEGIC HOTSPOT (DEPT)', `${topDept?.[0] || 'N/A'} (${topDept?.[1] || 0} REGS)`],
                    ['STRATEGIC HOTSPOT (YEAR)', `${topYear?.[0] || 'N/A'} YEAR (${topYear?.[1] || 0} REGS)`],
                    ['PARTICIPANT SATISFACTION (PULSE)', `${avgRating} / 5.0`]
                ],
                theme: 'striped',
                styles: { fontSize: 10, cellPadding: 8 },
                headStyles: { fillColor: [15, 23, 42] },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } }
            });

            addPageFooter(2);

            // --- PAGE 3: PARTICIPANT MANIFEST ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('REGISTRATION LOG');

            doc.setFontSize(16);
            doc.text('SECTION III: GLOBAL PARTICIPANT MANIFEST', 15, 45);

            const regTableData = eventRegs.map((r, i) => [
                i + 1,
                (r.studentName || 'N/A').toUpperCase(),
                r.studentRoll,
                r.studentDept,
                r.registeredAt?.toDate ? new Date(r.registeredAt.toDate()).toLocaleDateString() : 'N/A'
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['#', 'FULL NAME', 'IDENTITY ROLL', 'DEPT', 'REG DATE']],
                body: regTableData,
                headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
                styles: { fontSize: 7 }
            });
            addPageFooter(3);

            // --- PAGE 4: ATTENDANCE AUDIT ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('ATTENDANCE AUDIT');

            doc.setFontSize(16);
            doc.text('SECTION IV: VERIFIED ATTENDANCE AUDIT', 15, 45);

            const attendedList = eventRegs.filter(r => r.isAttended || r.status === 'Present').map((r, i) => [
                i + 1,
                (r.studentName || 'N/A').toUpperCase(),
                r.studentRoll,
                r.studentDept,
                'PRESENT'
            ]);

            const absentList = eventRegs.filter(r => !(r.isAttended || r.status === 'Present')).map((r, i) => [
                i + 1,
                (r.studentName || 'N/A').toUpperCase(),
                r.studentRoll,
                r.studentDept,
                'ABSENT'
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['#', 'IDENTIFIED ATTENDEES', 'ROLL NO', 'DEPT', 'STATUS']],
                body: attendedList,
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 7 }
            });

            if (absentList.length > 0) {
                doc.setFontSize(11);
                doc.text('NON-PARTICIPATING (ABSENTEE) OVERVIEW:', 15, doc.lastAutoTable.finalY + 15);
                autoTable(doc, {
                    startY: doc.lastAutoTable.finalY + 20,
                    head: [['#', 'STUDENT NAME', 'ROLL NO', 'DEPT', 'STATUS']],
                    body: absentList,
                    headStyles: { fillColor: [220, 38, 38] },
                    styles: { fontSize: 7 }
                });
            }
            addPageFooter(4);

            // --- PAGE 5: FEEDBACK INTELLIGENCE ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('FEEDBACK INSIGHTS');

            doc.setFontSize(16);
            doc.text('SECTION V: FEEDBACK & SENTIMENT ANALYSIS', 15, 45);

            const recommendationRate = ((eventFeedback.filter(f => f.rating >= 4).length / (eventFeedback.length || 1)) * 100).toFixed(1);

            autoTable(doc, {
                startY: 55,
                head: [['INTELLIGENCE METRIC', 'SCORE / STATUS', 'PERFORMANCE']],
                body: [
                    ['AVERAGE PARTICIPANT RATING', `${avgRating} / 5.0`, '★★★★★'.slice(0, Math.round(avgRating))],
                    ['RECOMMENDATION PROBABILITY', `${recommendationRate}%`, 'HIGHLY STRATEGIC'],
                    ['TOTAL FEEDBACK LOGS', eventFeedback.length.toString(), 'VERIFIED']
                ],
                headStyles: { fillColor: [124, 58, 237] }
            });

            let currentY = doc.lastAutoTable.finalY + 20;
            doc.setFontSize(12);
            doc.setTextColor(16, 185, 129);
            doc.text('👍 POSITIVE ENGAGEMENT HIGHLIGHTS', 15, currentY);

            currentY += 10;
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            eventFeedback.filter(f => f.rating >= 4).slice(0, 5).forEach(f => {
                const comment = f.comment || f.feedback || 'Incredible experience!';
                const textLines = doc.splitTextToSize(`• "${comment}"`, pageWidth - 30);
                doc.text(textLines, 15, currentY);
                currentY += (textLines.length * 5) + 3;
            });

            addPageFooter(5);

            // --- LAST PAGE: DECLARATION ---
            doc.addPage();
            drawBranding();
            await addLogos();

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('SECTION VI: INSTITUTIONAL DECLARATION', 15, 45);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const declaration = 'This Strategic Mission Dossier serves as the final official record of the event conducted by TechSpark Club. All participation data and feedback intelligence have been authenticated through institutional QR check-ins and system-verified logs. This report is designed for long-term audit and quality assessment purposes.';
            doc.text(doc.splitTextToSize(declaration, pageWidth - 30), 15, 60);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('MISSION CLASSIFICATION: SUCCESS', 15, 95);

            doc.line(15, 130, 70, 130);
            doc.line(pageWidth - 70, 130, pageWidth - 15, 130);
            doc.setFontSize(8);
            doc.text('ADMINISTRATOR SIGNATURE', 15, 135);
            doc.text('TECHSPARK BOARD CHAIR', pageWidth - 70, 135);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('TECHSPARK CLUB CENTRAL COMMAND', pageWidth / 2, pageHeight - 30, { align: 'center' });

            addPageFooter(6);

            // FINAL SAVE
            doc.save(`${event.title.replace(/\s+/g, '_')}_Final_Dossier.pdf`);
        } catch (error) {
            console.error("MASTER REPORT FAILURE:", error);
            alert("The Master Report assembly system encountered a terminal error.");
        }
    };

    const handleDownloadSubReport = async (event, type) => {
        if (!event) return;
        console.log(`SUB-EXTRACTION: ${type} FOR MISSION: ${event.title}`);
        const eventRegs = registrations.filter(r => r.eventId === event.id);
        const eventFeedback = feedbackBase.filter(f => f.eventId === event.id);

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
            summaryMetrics = [
                ['TOTAL REGISTERED', eventRegs.length.toString()],
                ['DEPT BREAKDOWN', Object.entries(b.depts).map(([k, v]) => `${k}:${v}`).join(' | ') || 'N/A'],
                ['YEAR BREAKDOWN', Object.entries(b.years).map(([k, v]) => `${k}:${v}`).join(' | ') || 'N/A'],
                ['SECTION BREAKDOWN', Object.entries(b.sections).map(([k, v]) => `${k}:${v}`).join(' | ') || 'N/A']
            ];
            tableHead = [['#', 'STUDENT NAME', 'ROLL NUMBER', 'DEPT', 'YEAR', 'REG DATE']];
            tableData = eventRegs.map((r, i) => [
                i + 1,
                (r.studentName || 'UNIDENTIFIED').toUpperCase(),
                r.studentRoll || 'N/A',
                r.studentDept || 'N/A',
                r.studentYear || 'N/A',
                r.registeredAt?.toDate?.() ? new Date(r.registeredAt.toDate()).toLocaleDateString() : 'N/A'
            ]);
            filenameSuffix = 'Registration_Log';
        } else if (type === 'ATTENDANCE') {
            title = 'VERIFIED ATTENDANCE AUDIT';
            const attended = eventRegs.filter(r => r.isAttended || r.status === 'Present');
            const b = getBreakdown(attended);
            summaryMetrics = [
                ['CONFIRMED ATTENDEES', attended.length.toString()],
                ['DEPT BREAKDOWN', Object.entries(b.depts).map(([k, v]) => `${k}:${v}`).join(' | ') || 'N/A'],
                ['YEAR BREAKDOWN', Object.entries(b.years).map(([k, v]) => `${k}:${v}`).join(' | ') || 'N/A'],
                ['ABSENTEE COUNT', (eventRegs.length - attended.length).toString()]
            ];
            tableHead = [['#', 'STUDENT NAME', 'ROLL NUMBER', 'DEPT', 'YEAR', 'STATUS']];
            tableData = attended.map((r, i) => [
                i + 1,
                (r.studentName || 'UNIDENTIFIED').toUpperCase(),
                r.studentRoll || 'N/A',
                r.studentDept || 'N/A',
                r.studentYear || 'N/A',
                'PRESENT'
            ]);
            filenameSuffix = 'Attendance_Checkin';
        } else if (type === 'FEEDBACK_STATUS') {
            title = 'FEEDBACK COMPLIANCE TRACKER';
            const submitted = eventRegs.filter(r => feedbackBase.some(f => f.eventId === event.id && f.studentRoll === r.studentRoll));
            const b = getBreakdown(submitted);
            summaryMetrics = [
                ['FEEDBACK SUBMITTED', submitted.length.toString()],
                ['PENDING FEEDBACK', (eventRegs.length - submitted.length).toString()],
                ['SUBMISSION RATE', `${((submitted.length / (eventRegs.length || 1)) * 100).toFixed(1)}%`],
                ['SUBMITTED DEPT WISE', Object.entries(b.depts).map(([k, v]) => `${k}:${v}`).join(' | ') || 'N/A']
            ];
            tableHead = [['#', 'STUDENT NAME', 'ROLL NUMBER', 'DEPT', 'CHECK-IN', 'FEEDBACK']];
            tableData = eventRegs.map((r, i) => {
                const fb = eventFeedback.find(f => f.studentRoll === r.studentRoll);
                return [
                    i + 1,
                    (r.studentName || 'UNIDENTIFIED').toUpperCase(),
                    r.studentRoll || 'N/A',
                    r.studentDept || 'N/A',
                    (r.isAttended || r.status === 'Present') ? 'YES' : 'NO',
                    fb ? 'SUBMITTED' : 'PENDING'
                ];
            });
            filenameSuffix = 'Feedback_Audit';
        }

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            // Brand Background
            const loadImg = (path) => new Promise(res => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = path;
            });
            const [rit, ts] = await Promise.all([loadImg(ritLogo), loadImg(techsparkLogo)]);

            // Green Bar & Header
            doc.setFillColor(16, 185, 129);
            doc.rect(0, 0, 5, 297, 'F');
            if (rit) doc.addImage(rit, 'PNG', 12, 10, 48, 15);
            if (ts) doc.addImage(ts, 'PNG', pageWidth - 60, 10, 45, 15);
            doc.setDrawColor(226, 232, 240);
            doc.line(12, 30, pageWidth - 12, 30);

            // Title
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
            doc.text(`GENERATED BY: ${(admin?.fullName || 'SYSTEM ADMIN').toUpperCase()} | REF: SUB-EXT-${Math.floor(Math.random() * 10000)}`, pageWidth / 2, 58, { align: 'center' });
            doc.text(`EXTRACTION LOGGED: ${new Date().toLocaleString().toUpperCase()}`, pageWidth / 2, 62, { align: 'center' });

            // Watermark
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.03 }));
            doc.setFontSize(35);
            doc.text('SYSTEM GENERATED AUDIT', pageWidth / 2, 150, { align: 'center', angle: -30 });
            doc.restoreGraphicsState();

            // SUMMARY METRICS TABLE
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

            // MAIN DATA TABLE
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 10,
                head: tableHead,
                body: tableData,
                headStyles: { fillColor: type === 'ATTENDANCE' ? [16, 185, 129] : type === 'FEEDBACK_STATUS' ? [124, 58, 237] : [15, 23, 42], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            // Footer for sub-reports
            const pages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pages; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(160);
                doc.text('ELECTRONICALLY VERIFIED AUDIT LOG | SYSTEM GENERATED DOCUMENT', pageWidth / 2, 290, { align: 'center' });
            }

            doc.save(`${event.title.replace(/\s+/g, '_')}_${filenameSuffix}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Strategic extraction failed.");
        }
    };

    const renderContent = () => {
        if (loadingData) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing with TechSpark Base...</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Premium Stat Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                            {[
                                { label: 'Total Students', value: stats.totalMembers, icon: <Users className="w-5 h-5" />, gradient: 'from-blue-500 to-cyan-400', bgGlow: 'bg-blue-500/10', change: '+12%', changeUp: true },
                                { label: 'Organizers', value: organizers.length, icon: <UserCog className="w-5 h-5" />, gradient: 'from-indigo-500 to-purple-500', bgGlow: 'bg-indigo-500/10', change: '+2', changeUp: true },
                                { label: 'Total Events', value: events.length, icon: <Calendar className="w-5 h-5" />, gradient: 'from-violet-500 to-purple-600', bgGlow: 'bg-violet-500/10', change: 'All Time', changeUp: null },
                                { label: 'Pending', value: events.filter(e => e.status === 'PENDING').length, icon: <ShieldAlert className="w-5 h-5" />, gradient: 'from-orange-500 to-amber-500', bgGlow: 'bg-orange-500/10', change: 'Awaiting', changeUp: null, pulse: true },
                                { label: 'Live Now', value: events.filter(e => e.status === 'LIVE').length, icon: <TrendingUp className="w-5 h-5" />, gradient: 'from-emerald-500 to-teal-500', bgGlow: 'bg-emerald-500/10', change: 'Active', changeUp: true, live: true },
                                { label: 'Registrations', value: registrations.length, icon: <ClipboardList className="w-5 h-5" />, gradient: 'from-cyan-500 to-blue-500', bgGlow: 'bg-cyan-500/10', change: '+5.2%', changeUp: true }
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    className={`relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/50 group cursor-pointer`}
                                >
                                    {/* Glow Effect */}
                                    <div className={`absolute -top-12 -right-12 w-32 h-32 ${stat.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500`} />

                                    {/* Icon with Gradient */}
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br ${stat.gradient} text-white shadow-lg relative`}>
                                        {stat.icon}
                                        {stat.live && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-ping" />
                                        )}
                                        {stat.pulse && stat.value > 0 && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-bounce" />
                                        )}
                                    </div>

                                    {/* Value */}
                                    <div className="flex items-end gap-2 mb-1">
                                        <span className="text-3xl font-black text-slate-900 tracking-tight">{stat.value.toLocaleString()}</span>
                                        {stat.changeUp !== null && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 ${stat.changeUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {stat.changeUp ? '↑' : '↓'} {stat.change}
                                            </span>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{stat.label}</div>

                                    {/* Sparkline Visual */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 opacity-50">
                                        <div className={`h-full bg-gradient-to-r ${stat.gradient} rounded-b-3xl`} style={{ width: `${Math.min(100, (stat.value / (stats.totalMembers || 1)) * 100)}%` }} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Analytics Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Department Distribution - Premium Card */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/30 relative overflow-hidden"
                            >
                                {/* Decorative Element */}
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-full blur-2xl" />

                                <div className="flex items-center justify-between mb-8 relative">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Department Intel</h3>
                                            <p className="text-xs text-slate-400 font-medium">Student distribution analysis</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{Object.keys(analytics.deptWise).length} Depts</span>
                                </div>

                                <div className="space-y-5 relative max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.entries(analytics.deptWise).sort((a, b) => b[1] - a[1]).map(([dept, count], idx) => (
                                        <motion.div
                                            key={dept}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + idx * 0.1 }}
                                        >
                                            <div className="flex justify-between text-xs font-bold uppercase mb-2">
                                                <span className="text-slate-700 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">{idx + 1}</span>
                                                    {dept}
                                                </span>
                                                <span className="text-blue-600 font-black">{count} <span className="text-slate-400 font-medium">({((count / stats.totalMembers) * 100).toFixed(1)}%)</span></span>
                                            </div>
                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(count / stats.totalMembers) * 100}%` }}
                                                    transition={{ duration: 1, delay: 0.5 + idx * 0.1, ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full relative"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Year-wise Distribution - Premium Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/30 relative overflow-hidden"
                            >
                                {/* Decorative Element */}
                                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-2xl" />

                                <div className="flex items-center justify-between mb-8 relative">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Year Breakdown</h3>
                                            <p className="text-xs text-slate-400 font-medium">Student cohort analysis</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{Object.keys(analytics.yearWise).length} Years</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 relative">
                                    {Object.entries(analytics.yearWise).map(([year, count], idx) => (
                                        <motion.div
                                            key={year}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.5 + idx * 0.1 }}
                                            whileHover={{ scale: 1.03 }}
                                            className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 text-center group cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-indigo-500/3 group-hover:to-purple-500/5 transition-all duration-500" />
                                            <div className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent relative">{count}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 relative">{year} Year</div>
                                            <div className="text-[9px] text-slate-300 font-medium mt-1 relative">{((count / stats.totalMembers) * 100).toFixed(1)}% of total</div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Recent Activity Section - Premium Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/30 overflow-hidden relative"
                        >
                            {/* Decorative gradient */}
                            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

                            <div className="p-8 border-b border-slate-100 flex items-center justify-between relative">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-3">
                                            Live Operations
                                            <span className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full normal-case">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                Real-time
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">Recent event activity across the platform</p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setActiveTab('all_events')}
                                    className="flex items-center gap-2 text-blue-600 text-xs font-black uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                                >
                                    View All <ArrowRight className="w-4 h-4" />
                                </motion.button>
                            </div>

                            <div className="overflow-x-auto relative">
                                <table className="w-full text-left">
                                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Event</th>
                                            <th className="px-4 py-4">Organizer</th>
                                            <th className="px-4 py-4 text-center">Regs</th>
                                            <th className="px-4 py-4 text-center">Status</th>
                                            <th className="px-4 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {events.slice(0, 5).map((event, idx) => (
                                            <motion.tr
                                                key={event.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.6 + idx * 0.1 }}
                                                className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-300 group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${event.type === 'WORKSHOP' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                                                            event.type === 'HACKATHON' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                                                                event.type === 'SEMINAR' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' :
                                                                    'bg-gradient-to-br from-orange-500 to-amber-500'
                                                            }`}>
                                                            <Calendar className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 uppercase leading-none mb-1 group-hover:text-blue-600 transition-colors">{event.title}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{event.type}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-500">
                                                            {event.createdBy?.charAt(0)?.toUpperCase() || 'A'}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600 uppercase">{event.createdBy || 'Admin'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-black border border-blue-100">
                                                        <Users className="w-3 h-3" />
                                                        {event.attendeesCount || 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${event.status === 'LIVE'
                                                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border border-emerald-200'
                                                        : event.status === 'PENDING'
                                                            ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-600 border border-orange-200'
                                                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                        }`}>
                                                        {event.status === 'LIVE' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                                                        {event.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => { e.stopPropagation(); handleOpenEditOrganizer(event); }}
                                                            className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-xl hover:from-blue-500 hover:to-indigo-600 hover:text-white transition-all duration-300 shadow-lg shadow-transparent hover:shadow-blue-500/30"
                                                            title="Change Organizer"
                                                        >
                                                            <UserCog className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleDeleteEvent(event.id)}
                                                            className="p-2.5 bg-gradient-to-br from-red-50 to-pink-50 text-red-500 rounded-xl hover:from-red-500 hover:to-pink-600 hover:text-white transition-all duration-300 shadow-lg shadow-transparent hover:shadow-red-500/30"
                                                            title="Delete Event"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>

                        {/* All Events Management Grid */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                <div>
                                    <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight flex items-center gap-3">
                                        <Calendar className="w-6 h-6 text-blue-600" />
                                        All Events Management
                                    </h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
                                        {events.length} Total Events • Delete Any Event
                                    </p>
                                </div>
                            </div>
                            <div className="p-8">
                                {events.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {events.map((event) => (
                                            <div key={event.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
                                                <div className="p-6">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${event.status === 'LIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                            event.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-slate-200 text-slate-600'
                                                            }`}>
                                                            {event.status}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${event.type === 'WORKSHOP' ? 'bg-blue-100 text-blue-700' :
                                                            event.type === 'HACKATHON' ? 'bg-purple-100 text-purple-700' :
                                                                event.type === 'SEMINAR' ? 'bg-emerald-100 text-emerald-700' :
                                                                    'bg-pink-100 text-pink-700'
                                                            }`}>
                                                            {event.type}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-800 uppercase mb-2 leading-tight">
                                                        {event.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-600 mb-4">
                                                        Organizer: <span className="font-bold">{event.createdBy || 'Admin'}</span>
                                                    </p>
                                                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="w-4 h-4 text-slate-400" />
                                                            <span className="text-xs font-bold text-slate-600">
                                                                {event.attendeesCount || 0} Regs
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleOpenEditOrganizer(event); }}
                                                                className="px-3 py-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all duration-300 hover:scale-105 flex items-center gap-2"
                                                                title="Change Organizer"
                                                            >
                                                                <UserCog className="w-4 h-4" />
                                                                <span className="text-[10px] font-black uppercase">Lead</span>
                                                            </button>
                                                            {event.type === 'Quiz' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenQuizSettings(event); }}
                                                                    className="px-3 py-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all duration-300 hover:scale-105 flex items-center gap-2"
                                                                    title="Quiz Settings"
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                    <span className="text-[10px] font-black uppercase">Settings</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                                                className="px-3 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300 hover:scale-105 flex items-center gap-2"
                                                                title="Delete Event"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                <span className="text-[10px] font-black uppercase">Delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20">
                                        <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No Events Found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'analytics':
                return (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tight">Student Intelligence</h3>
                                <p className="text-slate-500 font-medium text-sm">Real-time demographic and participation analytics</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                    {filteredStudents.length} Verified Members
                                </span>
                            </div>
                        </div>

                        {/* Advanced Filtration Terminal */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                            <div className="flex flex-col lg:flex-row items-end gap-6">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department Registry</label>
                                        <div className="relative group">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                            <select
                                                value={studentFilterDept}
                                                onChange={(e) => setStudentFilterDept(e.target.value)}
                                                className="w-full pl-11 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="ALL">All Departments</option>
                                                {Object.keys(analytics.deptWise).sort().map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Segment</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                            <select
                                                value={studentFilterYear}
                                                onChange={(e) => setStudentFilterYear(e.target.value)}
                                                className="w-full pl-11 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="ALL">All Year Groups</option>
                                                <option value="1">1st Year (Freshmen)</option>
                                                <option value="2">2nd Year (Sophomore)</option>
                                                <option value="3">3rd Year (Junior)</option>
                                                <option value="4">4th Year (Senior)</option>
                                                <option value="Alumni">Alumni / Graduates</option>
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Identification</label>
                                        <div className="relative group">
                                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                            <select
                                                value={studentFilterBatch}
                                                onChange={(e) => setStudentFilterBatch(e.target.value)}
                                                className="w-full pl-11 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="ALL">All Batch Cycles</option>
                                                {Object.keys(analytics.batchWise).sort().map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full lg:w-auto">
                                    {(studentFilterDept !== 'ALL' || studentFilterYear !== 'ALL' || studentFilterBatch !== 'ALL') && (
                                        <button
                                            onClick={() => {
                                                setStudentFilterDept('ALL');
                                                setStudentFilterYear('ALL');
                                                setStudentFilterBatch('ALL');
                                                setSearchQuery('');
                                            }}
                                            className="px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest flex-1 lg:flex-none border border-red-100"
                                        >
                                            Reset
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            const csv = [
                                                ['Name', 'Roll Number', 'Dept', 'Year', 'Batch', 'Points'],
                                                ...filteredStudents.map(s => {
                                                    const { year, batch, dept } = getStudentExtendedData(s);
                                                    return [s.fullName, s.rollNumber, dept, year, batch, s.points];
                                                })
                                            ].map(e => e.join(",")).join("\n");
                                            const blob = new Blob([csv], { type: 'text/csv' });
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.setAttribute('hidden', '');
                                            a.setAttribute('href', url);
                                            a.setAttribute('download', `TechSpark_Intelligence_${new Date().toISOString().split('T')[0]}.csv`);
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                        }}
                                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-xl shadow-slate-900/10 flex-1 lg:flex-none group"
                                    >
                                        <Download className="w-4 h-4 group-hover:animate-bounce" /> Export Segment
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Analytic Cards Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {[
                                { label: 'Top Department', value: Object.entries(analytics.deptWise).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A', icon: <Briefcase /> },
                                { label: 'Peak Year', value: Object.entries(analytics.yearWise).sort((a, b) => b[1] - a[1])[0]?.[0] + ' Year' || 'N/A', icon: <TrendingUp /> },
                                { label: 'Largest Batch', value: Object.entries(analytics.batchWise).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A', icon: <Users /> },
                                { label: 'Active Section', value: Object.entries(analytics.sectionWise).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A', icon: <PieChart /> }
                            ].map((card, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-[2rem] flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        {card.icon}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</div>
                                    <div className="text-xl font-black text-slate-800 uppercase tracking-tight">{card.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Analysis Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Year-wise List */}
                            <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Yearly Breakdown</h4>
                                <div className="space-y-4">
                                    {Object.entries(analytics.yearWise).sort().map(([year, count]) => (
                                        <div key={year} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-default">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{year} Year</span>
                                            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold leading-none">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Batch & Section breakdown table */}
                            <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 bg-[#f8fafe]/50 flex items-center justify-between">
                                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Cross-Demographic Analysis</h4>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button className="px-3 py-1.5 bg-white shadow-sm rounded-lg text-[10px] font-black uppercase text-blue-600">Batch</button>
                                        <button className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400">Section</button>
                                    </div>
                                </div>
                                <div className="p-0">
                                    <table className="w-full">
                                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-4 text-left">Segment</th>
                                                <th className="px-8 py-4 text-center">Population</th>
                                                <th className="px-8 py-4 text-right">Share (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {Object.entries(analytics.batchWise).sort((a, b) => b[1] - a[1]).map(([batch, count]) => (
                                                <tr key={batch} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-8 py-5 text-sm font-bold text-slate-700 uppercase tracking-tight italic">{batch}</td>
                                                    <td className="px-8 py-5 text-center font-mono font-bold text-slate-800">{count}</td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className="text-[10px] font-black text-blue-600">
                                                            {((count / stats.totalMembers) * 100).toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Master Directory Table (Searchable) */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Global Direct Membership</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Live Directory of {allStudents.length} Verified Users</p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-80">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="FILTER BY NAME / ROLL / DEPT..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsSearchScannerOpen(true)}
                                        className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 group"
                                        title="Scan Student Card"
                                    >
                                        <QrCode className="w-5 h-5" />
                                        <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Scan ID</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left">
                                    <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-5">Verified Member</th>
                                            <th className="px-8 py-5">Register ID</th>
                                            <th className="px-8 py-5">Sub-Division</th>
                                            <th className="px-8 py-5 text-center">Spark XP</th>
                                            <th className="px-8 py-5 text-right">Management</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredStudents.map((student) => (
                                            <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white border border-slate-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm uppercase shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                            {student.fullName?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.fullName}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{student.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 font-mono font-bold text-slate-600 text-xs">{student.rollNumber}</td>
                                                <td className="px-8 py-6">
                                                    <div className="space-y-1">
                                                        {(() => {
                                                            const { year, batch, dept } = getStudentExtendedData(student);
                                                            return (
                                                                <>
                                                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{dept}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                                        {year} Year | Batch {batch} | Sec {student.section || 'N/A'}
                                                                    </p>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                        {student.points || 0} XP
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => handleEditStudent(student)}
                                                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Edit Profile"
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleManageStudent(student)}
                                                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                            title="Mission Intelligence"
                                                        >
                                                            <UserCog className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStudent(student.id)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Terminate Membership"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div >
                    </div >
                );

            case 'approvals':
                const pendingEvents = (events || []).filter(e => e.status === 'PENDING' || e.status === 'VERIFICATION_PENDING');
                return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="mb-8">
                            <h3 className="text-3xl font-black text-slate-800 italic uppercase">Mission Authorization</h3>
                            <p className="text-slate-500 font-medium">Critical queue for event approvals and final completion verification</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {(pendingEvents || []).length > 0 ? (pendingEvents || []).map((event) => (
                                <div key={event.id} className={`bg-white p-8 rounded-[2.5rem] border ${event.status === 'PENDING' ? 'border-orange-200' : 'border-indigo-200'} shadow-sm relative overflow-hidden group flex flex-col transition-all hover:shadow-lg`}>
                                    <div className="absolute top-6 right-8">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${event.status === 'VERIFICATION_PENDING' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600 animate-pulse'
                                            }`}>
                                            {event.status === 'VERIFICATION_PENDING' ? 'READY TO COMPLETE' : 'APPROVAL PENDING'}
                                        </span>
                                    </div>

                                    <div className="mb-8">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3">{event.type || 'WORKSHOP'}</div>
                                        <h4 className="text-2xl font-black text-slate-800 leading-tight mb-3 uppercase tracking-tight">{event.title}</h4>
                                        <div className="space-y-2">
                                            <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" /> {event.date}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2 uppercase">
                                                <UserCog className="w-4 h-4" /> ORGANIZER: {event.createdBy}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mt-auto pt-6 border-t border-slate-50">
                                        <div className={`p-4 ${event.status === 'PENDING' ? 'bg-orange-50/50 border-orange-100' : 'bg-indigo-50/50 border-indigo-100'} rounded-2xl border`}>
                                            <p className={`text-[10px] font-black ${event.status === 'PENDING' ? 'text-orange-600' : 'text-indigo-600'} uppercase mb-2`}>
                                                {event.status === 'PENDING' ? 'Review Submission' : 'Verification Required'}
                                            </p>
                                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium line-clamp-2">{event.description}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={async () => {
                                                    const remarks = prompt("Enter rejection/revert remarks (MANDATORY):");
                                                    if (!remarks) return alert("Remarks are mandatory for rejection.");
                                                    await updateDoc(doc(db, 'events', event.id), {
                                                        status: event.status === 'PENDING' ? 'REJECTED' : 'LIVE',
                                                        remarks,
                                                        lastActionBy: admin.username,
                                                        lastActionAt: serverTimestamp()
                                                    });
                                                    fetchDashboardData();
                                                }}
                                                className="py-3 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors"
                                            >
                                                {event.status === 'PENDING' ? 'REJECT' : 'REVERT TO LIVE'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEventToApprove(event);
                                                    setShowApproveModal(true);
                                                }}
                                                className={`py-3 ${event.status === 'PENDING' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-indigo-600 shadow-indigo-500/20'} text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg`}
                                            >
                                                {event.status === 'PENDING' ? 'REVIEW & APPROVE' : 'VERIFY & CLOSE'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6 font-black text-slate-200 text-2xl">0</div>
                                    <h4 className="text-slate-500 font-black uppercase tracking-widest text-sm mb-2">Queue is Empty</h4>
                                    <p className="text-slate-400 text-[10px] font-bold italic max-w-xs">No pending approvals or verification requests at this moment.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'all_events':
                return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 italic uppercase">Global Event Registry</h3>
                                <p className="text-slate-500 font-medium">Read-only historical audit of all club operations</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative w-64">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH MISSIONS..."
                                        value={eventSearchQuery}
                                        onChange={(e) => setEventSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    />
                                </div>
                                <div className="relative w-48">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select
                                        value={eventStatusFilter}
                                        onChange={(e) => setEventStatusFilter(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="LIVE">Live</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="REJECTED">Rejected</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[200px]">Event</th>
                                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[100px]">Lead</th>
                                        <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-[100px]">Date</th>
                                        <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-[100px]">Stats</th>
                                        <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-[80px]">Status</th>
                                        <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(filteredEventsRegistry || []).map((event) => (
                                        <tr
                                            key={event.id}
                                            onClick={() => {
                                                setSelectedEventDetails(event);
                                                setShowEventDetailModal(true);
                                            }}
                                            className="group hover:bg-slate-50/80 transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-600"
                                        >
                                            <td className="px-4 py-4">
                                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[180px]" title={event.title}>{event.title}</p>
                                                <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">{event.type}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[90px]" title={event.createdBy}>{event.createdBy}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <p className="text-[10px] font-black text-slate-800 uppercase tabular-nums whitespace-nowrap">{event.date?.split('|')[0]?.trim()}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 tabular-nums">
                                                        <Activity className="w-2.5 h-2.5" /> {registrations.filter(r => r.eventId === event.id && (r.isAttended || r.status === 'Present')).length}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                                                        /{event.attendeesCount || 0}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${event.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    event.status === 'COMPLETED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        event.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                            'bg-slate-50 text-slate-400 border-slate-100'
                                                    }`}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center gap-1.5 justify-end flex-nowrap">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEditOrganizer(event); }}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                        title="Change Organizer"
                                                    >
                                                        <UserCog className="w-4 h-4" />
                                                    </button>
                                                    {/* Revert to LIVE button for COMPLETED events */}
                                                    {event.status === 'COMPLETED' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRevertToLive(event.id, event.title); }}
                                                            className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all"
                                                            title="Revert to LIVE"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {/* Quiz Settings button */}
                                                    {event.type === 'Quiz' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenQuizSettings(event); }}
                                                            className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all"
                                                            title="Quiz Settings"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'organizers':
                return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 italic uppercase">Organizer Corps</h3>
                                <p className="text-slate-500 font-medium">Manage credentials and tactical assignments for event leads</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => navigate('/checkin')}
                                    className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg shadow-slate-900/10 flex items-center gap-3 hover:scale-105 transition-all uppercase tracking-widest"
                                >
                                    <Terminal className="w-5 h-5" /> Launch Terminal
                                </button>
                                <button
                                    onClick={() => setIsOrgModalOpen(true)}
                                    className="px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-500/30 flex items-center gap-3 hover:scale-105 transition-all uppercase tracking-widest"
                                >
                                    <Plus className="w-5 h-5" /> Commission New Lead
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identify</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignment</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Passkey</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Trace</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {organizers.map((org) => (
                                        <tr key={org.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <p className="font-black text-slate-800 uppercase text-xs tracking-tight">{org.fullName}</p>
                                                <p className="font-mono text-[10px] text-blue-600 font-bold">{org.username}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{org.role}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{org.department}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <code className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-700 select-all tracking-widest border border-slate-200">{org.password}</code>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-[10px] font-bold text-slate-600 uppercase">{org.email}</p>
                                                <p className="font-mono text-[9px] text-slate-400 font-black">{org.phone}</p>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-4">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${org.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                        {org.status || 'Active'}
                                                    </span>
                                                    <button onClick={() => handleDeleteOrganizer(org.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {organizers.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <UserCog className="w-12 h-12 text-slate-100 mb-4" />
                                                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No active commissions</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'registrations':
                return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 italic uppercase">Registration Oracle</h3>
                                <p className="text-slate-500 font-medium">Global student participation log (Read-Only)</p>
                            </div>
                            <button
                                onClick={() => {
                                    const csv = [
                                        ['Event', 'Student', 'Roll No', 'Dept', 'Year', 'Date'],
                                        ...registrations.map(r => [r.eventTitle, r.studentName, r.studentRoll, r.studentDept, r.studentYear, r.registeredAt?.toDate?.() || 'N/A'])
                                    ].map(e => e.join(",")).join("\n");
                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.setAttribute('href', url);
                                    a.setAttribute('download', 'techspark_registrations.csv');
                                    a.click();
                                }}
                                className="px-6 py-3.5 border border-slate-200 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all uppercase tracking-widest flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" /> Export Analytics
                            </button>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Objective</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Participant</th>
                                        <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Trace</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(registrations || []).slice(0, 100).map((reg) => (
                                        <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{reg.eventTitle}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{reg.eventId?.slice(0, 8)}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-xs font-black text-slate-700 uppercase">{reg.studentName}</p>
                                                <p className="text-[9px] font-bold text-blue-600 uppercase tabular-nums">{reg.studentRoll}</p>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                {reg.isAttended || reg.status === 'Present' ? (
                                                    <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm shadow-emerald-200">
                                                        PRESENT
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-100 text-slate-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                        REGISTERED
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    {reg.studentYear} YEAR
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{reg.studentDept}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {registrations.length > 100 && (
                                <div className="p-4 bg-slate-50 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Showing first 100 records. Export for full dataset.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'scanner':
                return (
                    <div className="max-w-xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                            <div className="p-8 pb-12 text-center text-left">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <QrCode className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">Attendance Console</h3>
                                <p className="text-slate-500 text-sm mb-8">Scan student IDs for instant verification & XP distribution</p>

                                <div className="max-w-md mx-auto aspect-square bg-slate-900 rounded-[3rem] overflow-hidden relative group shadow-2xl border-8 border-white">
                                    {isScanning ? (
                                        <Scanner
                                            onScan={(result) => {
                                                const val = result[0]?.rawValue;
                                                if (val) processRollNumber(val);
                                            }}
                                            onError={(err) => console.error(err)}
                                            styles={{
                                                container: { width: '100%', height: '100%' },
                                                video: { objectFit: 'cover' }
                                            }}
                                            allowMultiple={false}
                                            scanDelay={2000}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-8">
                                            {scanFeedback?.type === 'loading' && (
                                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
                                            )}

                                            {scanFeedback?.type === 'success' && (
                                                <motion.div
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="text-center"
                                                >
                                                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <CheckCircle className="w-10 h-10 text-white" />
                                                    </div>
                                                    <h4 className="text-xl font-black uppercase text-emerald-400">Success!</h4>
                                                    <div className="mt-4 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 text-center">
                                                        <p className="text-lg font-bold text-white uppercase">{scanFeedback.student?.fullName}</p>
                                                        <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1">{scanFeedback.student?.rollNumber}</p>
                                                        <p className="text-[10px] text-blue-400 font-black mt-3 bg-blue-500/20 py-1 rounded-full">+20 XP AWARDED</p>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {scanFeedback?.type === 'error' && (
                                                <motion.div
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="text-center"
                                                >
                                                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <X className="w-10 h-10 text-white" />
                                                    </div>
                                                    <h4 className="text-xl font-black uppercase text-red-500 font-mono">Invalid ID</h4>
                                                    <p className="text-slate-400 text-sm mt-2">{scanFeedback.message}</p>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}

                                    <div className="absolute inset-0 border-[4px] border-blue-500/50 m-12 rounded-[2.5rem] pointer-events-none">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
                                    </div>
                                    <div className="absolute top-1/2 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-scan z-20" />
                                </div>

                                <div className="mt-10 flex flex-col items-center gap-4 w-full">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scanner Status: {isScanning ? 'Online & Ready' : 'Processing...'}</span>

                                    {!isManualEntryOpen ? (
                                        <button
                                            onClick={() => setIsManualEntryOpen(true)}
                                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center gap-3"
                                        >
                                            <Plus className="w-5 h-5" />
                                            MANUAL ENTRY
                                        </button>
                                    ) : (
                                        <form onSubmit={handleManualSubmit} className="flex gap-2 w-full max-w-sm animate-in fade-in duration-300">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={manualRollNumber}
                                                onChange={(e) => setManualRollNumber(e.target.value)}
                                                placeholder="Enter Roll Number..."
                                                className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                            />
                                            <button
                                                type="submit"
                                                className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase"
                                            >
                                                Submit
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'awards':
                return (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 border-b border-slate-100">
                            <h3 className="text-2xl font-black text-slate-800">Badges & Awards</h3>
                            <p className="text-slate-500 text-sm">Manage and distribute badges to students</p>
                        </div>
                        <div className="p-8 bg-slate-50/50 flex flex-col items-center justify-center min-h-[400px] border-b border-dashed border-slate-200">
                            <Award className="w-16 h-16 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Awards management module is active</p>
                            <p className="text-slate-300 text-[10px] mt-2 italic">Feature expanding soon with badge creation and assignment</p>
                        </div>
                    </div>
                );

            case 'reports':
                return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="mb-8">
                            <h3 className="text-3xl font-black text-slate-800 italic uppercase">Strategic Reports</h3>
                            <p className="text-slate-500 font-medium">Generate high-fidelity intelligence summaries</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: 'Event Impact Study', desc: 'KPIs, attendance metrics, and participation trends.', icon: <TrendingUp className="w-6 h-6" />, action: downloadEventImpactReport },
                                { title: 'Member Demographic', desc: 'Breakdown of student base by department and year.', icon: <Users className="w-6 h-6" />, action: downloadDemographicReport },
                                { title: 'Operational Audit', desc: 'Organizer activity and event approval history.', icon: <ShieldCheck className="w-6 h-6" />, action: downloadOperationalAuditReport }
                            ].map((report, i) => (
                                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group flex flex-col">
                                    <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                        {report.icon}
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">{report.title}</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed mb-8">{report.desc}</p>
                                    <button
                                        onClick={report.action}
                                        className="mt-auto py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all"
                                    >
                                        Generate PDF
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'settings':
                return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="mb-8">
                            <h3 className="text-3xl font-black text-slate-800 italic uppercase">Club Protocol</h3>
                            <p className="text-slate-500 font-medium">Global configuration for TechSpark operations</p>
                        </div>

                        <div className="max-w-4xl space-y-6">
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Club Identification</label>
                                        <input type="text" defaultValue="TechSpark Club" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year</label>
                                        <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer">
                                            <option>2025 - 2026</option>
                                            <option>2024 - 2025</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Certificate Verification API Settings */}
                                <div className="pt-6 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <Key className="w-4 h-4 text-blue-600" />
                                            Certificate Verification API
                                        </h5>
                                        <a
                                            href="https://script.google.com/home"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 hover:underline"
                                        >
                                            Open Apps Script <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mb-2">
                                            <div className="text-[10px] font-bold text-blue-800 flex items-start gap-2">
                                                <Info className="w-4 h-4 flex-shrink-0" />
                                                <span>
                                                    Deployment Guide: 1. Deploy as Web App 2. Set Access to 'Anyone'
                                                    3. Use the URL ending in /exec. Your spreadsheet must have a sheet
                                                    named 'Form Responses 1'.
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Live Web App URL</label>
                                            <input
                                                type="text"
                                                value={certApiUrl}
                                                onChange={(e) => setCertApiUrl(e.target.value)}
                                                placeholder="https://script.google.com/macros/s/.../exec"
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-mono"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => {
                                                    localStorage.setItem('certApiUrl', certApiUrl);
                                                    alert('✅ Certificate API URL saved successfully!');
                                                }}
                                                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:scale-[1.02] transition-all flex items-center gap-2"
                                            >
                                                <Download className="w-4 h-4" /> Save URL
                                            </button>
                                            <button
                                                onClick={handleTestApi}
                                                disabled={isTestingApi || !certApiUrl}
                                                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isTestingApi ? <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> : <Activity className="w-4 h-4 text-emerald-600" />}
                                                Test Connection
                                            </button>
                                        </div>

                                        {apiTestMessage && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`p-4 rounded-2xl text-[10px] font-bold flex items-start gap-2 ${apiTestMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                                    }`}
                                            >
                                                {apiTestMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                {apiTestMessage.text}
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-50">
                                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">Operational Toggles</h5>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Mandatory Admin Review for All Events', active: true },
                                            { label: 'Enable Real-time Student Data Sync', active: true },
                                            { label: 'Organizer Creation Restriction', active: false }
                                        ].map((toggle, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                <span className="text-[10px] font-black uppercase text-slate-600">{toggle.label}</span>
                                                <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${toggle.active ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${toggle.active ? 'left-6' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.01] transition-all">
                                    Update Protocol Settings
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'logs':
                return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="mb-8">
                            <h3 className="text-3xl font-black text-slate-800 italic uppercase">Security Audit Log</h3>
                            <p className="text-slate-500 font-medium">Real-time trace of administrative and organizer operations</p>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                            <table className="w-full text-left">
                                <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5">Timestamp</th>
                                        <th className="px-8 py-5">Agent</th>
                                        <th className="px-8 py-5">Action Objective</th>
                                        <th className="px-8 py-5 text-right">Integrity Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(securityLogs || []).length > 0 ? (securityLogs || []).map((log, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 font-mono text-[10px] text-slate-400 font-bold">
                                                {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString() : 'JUST NOW'}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">{log.adminId || log.executedBy || 'SYSTEM'}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{log.action}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{log.target || 'GLOBAL_PROTOCOL'}</p>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className="flex items-center justify-end gap-1.5 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                                                    <ShieldCheck className="w-3 h-3" /> {log.status || 'VERIFIED'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <ShieldAlert className="w-12 h-12 text-slate-100 mb-4" />
                                                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No security incidents logged</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'submissions':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-left">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase italic">Quiz <span className="text-blue-600">Intelligence</span></h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Real-time global quiz performance monitoring</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (submissions.length === 0) return;
                                    const csv = [['Event', 'Student Name', 'Roll Number', 'Score', 'Submitted At'], ...submissions.map(s => [s.eventTitle, s.name, s.rollNumber, s.score, s.timestamp?.toDate ? s.timestamp.toDate().toLocaleString() : 'N/A'])].map(e => e.join(",")).join("\n");
                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.setAttribute('href', url);
                                    a.setAttribute('download', 'techspark_global_quiz_results.csv');
                                    a.click();
                                }}
                                className="px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Download className="w-4 h-4" /> Global Export
                            </button>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[400px]">
                            <table className="w-full text-left">
                                <thead className="bg-[#fcfdfe] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-6">Operation / Event</th>
                                        <th className="px-8 py-6">Identity Signature</th>
                                        <th className="px-8 py-6">Score Metric</th>
                                        <th className="px-8 py-6 text-right">Synchronization Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {submissions.length > 0 ? submissions.map((sub) => (
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
                                                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-black text-xs border border-blue-100 italic">
                                                        {sub.score || 0}
                                                    </div>
                                                    <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-600" style={{ width: `${Math.min((sub.score / 100) * 100, 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {sub.timestamp?.toDate ? sub.timestamp.toDate().toLocaleTimeString() : 'LOGGED'}
                                                </p>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center text-slate-300 font-black uppercase italic text-xs">No global quiz signals intercepted</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
        }
    };

    if (!admin) return null;

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Premium Glassmorphic Sidebar - Fixed */}
            <aside className="w-80 h-screen sticky top-0 bg-gradient-to-b from-[#0a0f1a] via-[#0f172a] to-[#0a0f1a] text-white hidden lg:flex flex-col border-r border-white/5 relative overflow-hidden">
                {/* Animated Background Effects */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 p-8 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Brand Header with Live Status */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <img src={techsparkLogo} alt="TechSpark" className="h-9 w-auto object-contain" />
                            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                            <div>
                                <span className="text-xs font-black tracking-widest text-blue-400 uppercase block">Super Admin</span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Control Panel</span>
                            </div>
                        </div>
                        {/* Live Status Indicator */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Live</span>
                        </div>
                    </div>

                    {/* System Health Banner */}
                    <div className="mb-8 p-4 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Health</span>
                            <span className="text-[10px] font-black text-emerald-400 uppercase">Optimal</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 bg-white/5 rounded-xl text-center">
                                <div className="text-lg font-black text-white">{stats.totalMembers}</div>
                                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Users</div>
                            </div>
                            <div className="p-2 bg-white/5 rounded-xl text-center">
                                <div className="text-lg font-black text-emerald-400">{events.filter(e => e.status === 'LIVE').length}</div>
                                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Active</div>
                            </div>
                            <div className="p-2 bg-white/5 rounded-xl text-center relative">
                                <div className="text-lg font-black text-orange-400">{events.filter(e => e.status === 'PENDING').length}</div>
                                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Pending</div>
                                {events.filter(e => e.status === 'PENDING').length > 0 && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Advanced Navigation */}
                    <nav className="space-y-1.5">
                        {[
                            { id: 'overview', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', desc: 'Overview & Analytics' },
                            { id: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Student Intel', desc: 'Demographics & Insights' },
                            { id: 'organizers', icon: <UserCog className="w-5 h-5" />, label: 'Organizers', desc: 'Team Management', badge: organizers.length },
                            { id: 'approvals', icon: <CalendarCheck className="w-5 h-5" />, label: 'Approvals', desc: 'Event Authorization', badge: events.filter(e => e.status === 'PENDING').length, badgeColor: 'orange' },
                            { id: 'all_events', icon: <Calendar className="w-5 h-5" />, label: 'All Events', desc: 'Complete Registry' },
                            { id: 'registrations', icon: <ClipboardList className="w-5 h-5" />, label: 'Registrations', desc: 'Participant Data' },
                            { id: 'reports', icon: <PieChart className="w-5 h-5" />, label: 'Reports', desc: 'PDF Intelligence' },
                            { id: 'submissions', icon: <Activity className="w-5 h-5" />, label: 'Quiz Scores', desc: 'Live Performance', isLive: true },
                            { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings', desc: 'System Config' },
                            { id: 'logs', icon: <ShieldAlert className="w-5 h-5" />, label: 'Security', desc: 'Audit Trail' }
                        ].map((item) => (
                            <motion.button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group relative overflow-hidden ${activeTab === item.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {activeTab === item.id && (
                                    <motion.div
                                        layoutId="activeNavBg"
                                        className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <div className={`p-2 rounded-xl ${activeTab === item.id ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'} transition-all`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2">
                                        <span>{item.label}</span>
                                        {item.isLive && (
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                        )}
                                    </div>
                                    <span className={`text-[9px] font-medium ${activeTab === item.id ? 'text-white/70' : 'text-slate-600'}`}>
                                        {item.desc}
                                    </span>
                                </div>
                                {item.badge > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeColor === 'orange'
                                        ? 'bg-orange-500 text-white animate-pulse'
                                        : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </motion.button>
                        ))}
                    </nav>
                </div>

                {/* Admin Profile Section */}
                <div className="mt-auto relative z-10 p-6 border-t border-white/5 bg-gradient-to-t from-black/20 to-transparent">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl mb-4 text-left backdrop-blur-sm border border-white/5">
                        <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20 relative">
                            {admin.username?.charAt(0).toUpperCase()}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0f172a] flex items-center justify-center">
                                <ShieldCheck className="w-2.5 h-2.5 text-white" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-black truncate uppercase text-white">{admin.username}</p>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Super Administrator</p>
                            <p className="text-[9px] text-slate-600 font-medium mt-1">Last login: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    <motion.button
                        onClick={handleLogout}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:from-red-500/20 hover:to-red-600/20 transition-all border border-red-500/10"
                    >
                        <LogOut className="w-4 h-4" />
                        Terminate Session
                    </motion.button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
                {/* Premium Header */}
                <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 flex items-center justify-between sticky top-0 z-10">
                    <div className="text-left">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                                {activeTab === 'overview' && <LayoutDashboard className="w-5 h-5 text-white" />}
                                {activeTab === 'analytics' && <BarChart3 className="w-5 h-5 text-white" />}
                                {activeTab === 'organizers' && <UserCog className="w-5 h-5 text-white" />}
                                {activeTab === 'approvals' && <CalendarCheck className="w-5 h-5 text-white" />}
                                {activeTab === 'all_events' && <Calendar className="w-5 h-5 text-white" />}
                                {activeTab === 'registrations' && <ClipboardList className="w-5 h-5 text-white" />}
                                {activeTab === 'reports' && <PieChart className="w-5 h-5 text-white" />}
                                {activeTab === 'submissions' && <Activity className="w-5 h-5 text-white" />}
                                {activeTab === 'settings' && <Settings className="w-5 h-5 text-white" />}
                                {activeTab === 'logs' && <ShieldAlert className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    {activeTab.replace('_', ' ')}
                                    <span className="text-slate-300 mx-1">/</span>
                                    <span className="text-blue-600 text-sm font-bold normal-case tracking-normal">Control Center</span>
                                </h2>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="relative hidden xl:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search anything..."
                                className="w-64 pl-11 pr-4 py-3 bg-slate-100/80 border border-slate-200/50 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                            />
                            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-400 border border-slate-200">⌘K</kbd>
                        </div>

                        {/* Notification Bell */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative p-3 bg-slate-100/80 hover:bg-slate-200/80 rounded-2xl transition-all group"
                        >
                            <Bell className="w-5 h-5 text-slate-600 group-hover:text-slate-800" />
                            {events.filter(e => e.status === 'PENDING').length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                                    {events.filter(e => e.status === 'PENDING').length}
                                </span>
                            )}
                        </motion.button>

                        {/* Quick Stats */}
                        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/50">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-emerald-700">{events.filter(e => e.status === 'LIVE').length} Live Events</span>
                        </div>

                        {/* Refresh Button */}
                        <motion.button
                            whileHover={{ scale: 1.05, rotate: 180 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => window.location.reload()}
                            className="p-3 bg-slate-100/80 hover:bg-blue-500 hover:text-white rounded-2xl transition-all text-slate-600"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </motion.button>
                    </div>
                </header>

                {/* Content Area with subtle pattern */}
                <div className="p-8 relative">
                    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                    <div className="relative z-10">
                        {renderContent()}
                    </div>
                </div>
            </main>

            {/* Organizer Creation Modal */}
            <AnimatePresence>
                {isOrgModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOrgModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between text-left">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 italic uppercase">Commission Lead</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Credentials will grant access to Check-in Console</p>
                                </div>
                                <button onClick={() => setIsOrgModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateOrganizer} className="p-8 space-y-4 text-left">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity</label>
                                    <input
                                        required
                                        type="text"
                                        value={newOrg.fullName}
                                        onChange={(e) => setNewOrg({ ...newOrg, fullName: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-black text-[11px] uppercase tracking-wider"
                                        placeholder="Enter Full Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                        <input
                                            required
                                            type="text"
                                            value={newOrg.username}
                                            onChange={(e) => setNewOrg({ ...newOrg, username: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-black text-[11px] tracking-widest"
                                            placeholder="jdoe_org"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Passkey</label>
                                        <input
                                            required
                                            type="text"
                                            value={newOrg.password}
                                            onChange={(e) => setNewOrg({ ...newOrg, password: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-mono font-bold text-[11px]"
                                            placeholder="••••••"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                                        <input
                                            required
                                            type="email"
                                            value={newOrg.email}
                                            onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-[11px] lowercase"
                                            placeholder="org@ritchennai.edu.in"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Trace</label>
                                        <input
                                            required
                                            type="tel"
                                            value={newOrg.phone}
                                            onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-mono font-bold text-[11px]"
                                            placeholder="+91..."
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Dept</label>
                                        <select
                                            value={newOrg.department}
                                            onChange={(e) => setNewOrg({ ...newOrg, department: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-[11px] uppercase tracking-widest"
                                        >
                                            <option value="">Select Dept</option>
                                            <option value="CSE">CSE</option>
                                            <option value="IT">IT</option>
                                            <option value="AI-DS">AI-DS</option>
                                            <option value="AI-ML">AI-ML</option>
                                            <option value="ECE">ECE</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Strategic Role</label>
                                        <select
                                            value={newOrg.role}
                                            onChange={(e) => setNewOrg({ ...newOrg, role: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-[11px] uppercase tracking-widest"
                                        >
                                            <option value="Event Organizer">Event Organizer</option>
                                            <option value="Secretary">Secretary</option>
                                            <option value="Check-in Officer">Check-in Officer</option>
                                            <option value="Terminal Operator">Terminal Operator</option>
                                            <option value="Senior Coordinator">Senior Coordinator</option>
                                            <option value="Technical Lead">Technical Lead</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingOrg}
                                    className="w-full py-4 bg-slate-900 text-white rounded-[1.25rem] font-black text-xs shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3 uppercase disabled:opacity-50 mt-4 tracking-[0.2em]"
                                >
                                    {isSubmittingOrg ? 'Initiating...' : 'Register Organizer'}
                                    <Shield className="w-4 h-4" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Event Detail / Mission Intelligence Modal */}
            <AnimatePresence>
                {showEventDetailModal && selectedEventDetails && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowEventDetailModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
                        >
                            {/* Modal Header */}
                            <div className="p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                        <Activity className="w-8 h-8 text-blue-500" />
                                        Mission Intelligence: {selectedEventDetails.title}
                                    </h3>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 italic">Tactical deployment data & participation audit</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleOpenEditOrganizer(selectedEventDetails)}
                                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all border border-white/10"
                                    >
                                        <UserCog className="w-4 h-4" /> Change Lead
                                    </button>
                                    <button
                                        onClick={() => handleDownloadFinalReport(selectedEventDetails)}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all"
                                    >
                                        <Download className="w-4 h-4" /> Final Report
                                    </button>
                                    <button onClick={() => setShowEventDetailModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#fcfdfe]">
                                {/* Quick Stats Row */}
                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    {[
                                        { label: 'Total Registered', value: registrations.filter(r => r.eventId === selectedEventDetails.id).length, icon: <Users />, color: 'blue' },
                                        { label: 'Confirmed Present', value: registrations.filter(r => r.eventId === selectedEventDetails.id && (r.isAttended || r.status === 'Present')).length, icon: <CheckCircle />, color: 'emerald' },
                                        { label: 'Absent/No-Show', value: registrations.filter(r => r.eventId === selectedEventDetails.id && !(r.isAttended || r.status === 'Present')).length, icon: <X />, color: 'red' },
                                        { label: 'Feedback Received', value: registrations.filter(r => r.eventId === selectedEventDetails.id && r.feedbackSubmitted).length, icon: <HelpCircle />, color: 'purple' }
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
                                                {stat.icon}
                                            </div>
                                            <div>
                                                <div className="text-2xl font-black text-slate-800 tabular-nums">{stat.value}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Granular Reports Hub */}
                                <div className="grid grid-cols-3 gap-6 mb-8">
                                    {[
                                        { title: 'Registration Log', desc: 'Complete directory of all event sign-ups.', action: () => handleDownloadSubReport(selectedEventDetails, 'REGISTRATION') },
                                        { title: 'Check-in Audit', desc: 'Verified list of confirmed attendees.', action: () => handleDownloadSubReport(selectedEventDetails, 'ATTENDANCE') },
                                        { title: 'Feedback Tracker', desc: 'Submission status & compliance audit.', action: () => handleDownloadSubReport(selectedEventDetails, 'FEEDBACK_STATUS') }
                                    ].map((hub, i) => (
                                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-200 transition-all flex flex-col items-center text-center group">
                                            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Download className="w-5 h-5" />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{hub.title}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 mb-4">{hub.desc}</p>
                                            <button
                                                onClick={hub.action}
                                                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Export PDF
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Participant Directory */}
                                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest italic">Live Participant Roster</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Authorized Viewing Only</p>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-[#fcfdfe] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <tr>
                                                <th className="px-8 py-4">Student Identity</th>
                                                <th className="px-8 py-4">Status</th>
                                                <th className="px-8 py-4">Feedback Intelligence</th>
                                                <th className="px-8 py-4 text-right">Strategic Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {registrations
                                                .filter(r => r.eventId === selectedEventDetails.id)
                                                .map((reg) => {
                                                    const fb = feedbackBase.find(f => f.eventId === selectedEventDetails.id && f.studentRoll === reg.studentRoll);
                                                    return (
                                                        <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-8 py-5">
                                                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{reg.studentName}</p>
                                                                <p className="text-[10px] text-blue-600 font-mono font-bold">{reg.studentRoll}</p>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                {(reg.isAttended || reg.status === 'Present') ? (
                                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">Present</span>
                                                                ) : (
                                                                    <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-100">Absent</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                {reg.feedbackSubmitted ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-purple-100 w-fit">Intelligence Logged</span>
                                                                        {fb && <p className="text-[9px] text-slate-400 font-medium italic line-clamp-1">"{fb.comment || fb.feedback}"</p>}
                                                                    </div>
                                                                ) : (
                                                                    <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100">No Data</span>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                {reg.feedbackSubmitted && (
                                                                    <button
                                                                        onClick={() => handleUndoFeedback(reg.id, fb?.id)}
                                                                        className="p-2.5 text-orange-500 hover:bg-orange-50 rounded-xl transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ml-auto"
                                                                        title="UNDO FEEDBACK"
                                                                    >
                                                                        <RotateCcw className="w-3.5 h-3.5" /> UNDO
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Event Approval Review Modal */}
            <AnimatePresence>
                {showApproveModal && eventToApprove && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowApproveModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
                        >
                            {/* Header */}
                            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between font-black uppercase tracking-widest italic">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase italic">Event Review & Authorization</h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Inspecting organizer deployment details before broadcast</p>
                                </div>
                                <button onClick={() => setShowApproveModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            {/* Detailed Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 text-left bg-[#fcfdfe]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Core Details */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Title</label>
                                            <p className="text-xl font-black text-slate-800 uppercase leading-tight">{eventToApprove.title}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                                                <span className="block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black w-fit uppercase">{eventToApprove.type}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organizer</label>
                                                <p className="text-sm font-bold text-slate-700 uppercase">{eventToApprove.createdBy}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">{eventToApprove.description}</p>
                                        </div>
                                    </div>

                                    {/* Logistics & Constraints */}
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-blue-600">
                                                    <Calendar className="w-4 h-4" />
                                                    <label className="text-[10px] font-black uppercase tracking-widest">Date</label>
                                                </div>
                                                <p className="text-sm font-black text-slate-800">{eventToApprove.date}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <Clock className="w-4 h-4" />
                                                    <label className="text-[10px] font-black uppercase tracking-widest">Time</label>
                                                </div>
                                                <p className="text-sm font-black text-slate-800">{eventToApprove.time || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <MapPin className="w-4 h-4" />
                                                <label className="text-[10px] font-black uppercase tracking-widest">Venue / Base</label>
                                            </div>
                                            <p className="text-sm font-black text-slate-800 uppercase">{eventToApprove.venue || 'Block-B, Lab 402'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Capacity</label>
                                                <p className="text-sm font-black text-slate-800">{eventToApprove.maxNo || 100} Members</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audience</label>
                                                <p className="text-sm font-black text-slate-800 uppercase">{eventToApprove.targetAudience || 'All Departments'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Coordinator Details */}
                                <div className="p-6 bg-white border border-slate-100 rounded-3xl">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-blue-600" /> Operational Coordinators
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 font-black">C1</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 uppercase">{eventToApprove.coord1Name || 'Not Specified'}</p>
                                                <p className="text-[10px] text-slate-400 font-mono font-medium">{eventToApprove.coord1Phone || 'No Trace'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 font-black">C2</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 uppercase">{eventToApprove.coord2Name || 'Not Specified'}</p>
                                                <p className="text-[10px] text-slate-400 font-mono font-medium">{eventToApprove.coord2Phone || 'No Trace'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
                                <button
                                    onClick={async () => {
                                        const remarks = prompt("Enter rejection/revert remarks (MANDATORY):");
                                        if (!remarks) return alert("Remarks are mandatory for rejection.");
                                        await updateDoc(doc(db, 'events', eventToApprove.id), {
                                            status: 'REJECTED',
                                            remarks,
                                            lastActionBy: admin.username,
                                            lastActionAt: serverTimestamp()
                                        });
                                        setShowApproveModal(false);
                                        fetchDashboardData();
                                    }}
                                    className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Reject Submission
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm("Authorize this event for LIVE broadcast? This will make it visible to all students.")) return;
                                        await updateDoc(doc(db, 'events', eventToApprove.id), {
                                            status: 'LIVE',
                                            remarks: 'Approved by Super Admin after technical review',
                                            lastActionBy: admin.username,
                                            lastActionAt: serverTimestamp()
                                        });
                                        setShowApproveModal(false);
                                        fetchDashboardData();
                                    }}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                                >
                                    <ShieldCheck className="w-5 h-5" /> Approve Live
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Student Modal */}
            <AnimatePresence>
                {isEditStudentModalOpen && editingStudent && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditStudentModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between text-left">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 italic uppercase">Edit Personnel Data</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Manual override of student identity profile</p>
                                </div>
                                <button onClick={() => setIsEditStudentModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveStudent} className="p-8 space-y-5 text-left bg-[#fcfdfe]">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Full Name - READ ONLY</label>
                                    <input
                                        required
                                        type="text"
                                        value={editingStudent.fullName}
                                        disabled
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-xs uppercase tracking-tight text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Register Number</label>
                                        <input
                                            required
                                            type="text"
                                            value={editingStudent.rollNumber}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, rollNumber: e.target.value })}
                                            className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-mono font-bold text-xs text-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Department - READ ONLY</label>
                                        <select
                                            disabled
                                            value={editingStudent.department}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-xs uppercase tracking-widest text-slate-500 cursor-not-allowed"
                                        >
                                            <option value="CSE">CSE</option>
                                            <option value="IT">IT</option>
                                            <option value="AIDS">AI-DS</option>
                                            <option value="AIML">AI-ML</option>
                                            <option value="ECE">ECE</option>
                                            <option value="EEE">EEE</option>
                                            <option value="MECH">MECH</option>
                                            <option value="CIVIL">CIVIL</option>
                                            <option value="MCT">MCT</option>
                                            <option value="BME">BME</option>
                                            <option value="BT">BT</option>
                                            <option value="CHEMICAL">CHEMICAL</option>
                                            <option value="OTHERS">OTHERS</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Study Year</label>
                                        <select
                                            value={editingStudent.yearOfStudy}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, yearOfStudy: e.target.value })}
                                            className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl outline-none font-black text-xs uppercase"
                                        >
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3">3rd Year</option>
                                            <option value="4">4th Year</option>
                                            <option value="Alumni">Alumni</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                                        <select
                                            value={editingStudent.section}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, section: e.target.value })}
                                            className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl outline-none font-black text-xs uppercase"
                                        >
                                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(sec => (
                                                <option key={sec} value={sec}>Sec {sec}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Year</label>
                                        <input
                                            type="text"
                                            value={editingStudent.admissionYear}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, admissionYear: e.target.value })}
                                            className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl outline-none font-black text-xs tabular-nums"
                                            placeholder="2024"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Digital Identity (Email) - READ ONLY</label>
                                    <input
                                        required
                                        type="email"
                                        value={editingStudent.email}
                                        disabled
                                        className="w-full px-5 py-4 bg-slate-100 border border-slate-100 rounded-2xl outline-none font-bold text-xs lowercase text-slate-400 cursor-not-allowed"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 uppercase mt-4 tracking-widest"
                                >
                                    Commit Changes
                                    <ShieldCheck className="w-4 h-4" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Manage Student / History Modal */}
            <AnimatePresence>
                {isManageStudentModalOpen && editingStudent && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsManageStudentModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100"
                        >
                            <div className="p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center font-black text-2xl uppercase shadow-lg shadow-blue-500/20">
                                        {editingStudent.fullName?.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tight">{editingStudent.fullName}</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{editingStudent.rollNumber} | {editingStudent.department} DEP</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsManageStudentModalOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#fcfdfe]">
                                <div className="grid grid-cols-3 gap-6 mb-8">
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-left">
                                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Spark XP</div>
                                        <div className="text-3xl font-black text-emerald-700">{editingStudent.points || 0}</div>
                                    </div>
                                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-left">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Missions Joined</div>
                                        <div className="text-3xl font-black text-blue-700">{selectedStudentHistory.length}</div>
                                    </div>
                                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-left">
                                        <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Badges Earned</div>
                                        <div className="text-3xl font-black text-indigo-700">{editingStudent.badges?.length || 0}</div>
                                    </div>
                                </div>

                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 italic border-b border-slate-100 pb-4 text-left flex items-center gap-3">
                                    <Activity className="w-5 h-5 text-blue-600" /> Tactical Mission History
                                </h4>

                                {selectedStudentHistory.length > 0 ? (
                                    <div className="space-y-4 text-left">
                                        {selectedStudentHistory.map((history, i) => (
                                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                                                <div className="text-left">
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{history.eventTitle}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{history.eventDate}</p>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <div className="text-center">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${history.isAttended || history.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                            {history.isAttended || history.status === 'Present' ? 'COMPLETED' : 'ABSENT'}
                                                        </span>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Feedback</p>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${history.feedbackSubmitted ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            {history.feedbackSubmitted ? 'SUBMITTED' : 'PENDING'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center px-6">
                                        <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                                        <h4 className="text-slate-400 font-black uppercase tracking-widest text-xs">No Deployment Records</h4>
                                        <p className="text-slate-300 text-[10px] font-bold italic mt-1">This member has not participated in any tracked mission yet.</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Authorized Member Identity Access</p>
                                <button onClick={() => setIsManageStudentModalOpen(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                                    Close Audit
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Search Scanner Modal */}
            <AnimatePresence>
                {isSearchScannerOpen && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSearchScannerOpen(false)}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
                        >
                            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                        <QrCode className="w-6 h-6 text-blue-500" />
                                        Identity Scanner
                                    </h3>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Digital Student Lookup</p>
                                </div>
                                <button onClick={() => setIsSearchScannerOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8">
                                <div className="aspect-square bg-slate-950 rounded-[2.5rem] overflow-hidden relative border-4 border-slate-100 shadow-inner">
                                    <Scanner
                                        onScan={handleSearchScan}
                                        onError={(err) => console.error(err)}
                                        styles={{
                                            container: { width: '100%', height: '100%' },
                                            video: { objectFit: 'cover' }
                                        }}
                                        allowMultiple={false}
                                        scanDelay={2000}
                                    />
                                    <div className="absolute inset-0 border-[3px] border-blue-500/30 m-10 rounded-[2rem] pointer-events-none">
                                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                                    </div>
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan z-20" />
                                </div>
                                <p className="text-center mt-6 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                    Position the Student QR Code within the frame<br />for instantaneous recognition
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Quiz Settings Modal */}
            {showQuizSettingsModal && quizSettingsEvent && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Quiz Settings</h3>
                                        <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest">{quizSettingsEvent.title}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowQuizSettingsModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google Form URL *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="https://docs.google.com/forms/d/e/..."
                                        value={quizSettings.quizFormUrl}
                                        onChange={(e) => {
                                            const url = e.target.value;
                                            let updatedSettings = { ...quizSettings, quizFormUrl: url };

                                            if (url.includes('entry.')) {
                                                try {
                                                    const urlObj = new URL(url);
                                                    const searchParams = new URLSearchParams(urlObj.search);
                                                    let extractedAny = false;

                                                    const mappings = {
                                                        quizEntryMobile: ['phone', 'mobile', 'contact', '987'],
                                                        quizEntryName: ['name', 'student', 'test', 'full'],
                                                        quizEntryRoll: ['roll', 'reg', '123', 'number', 'id'],
                                                        quizEntryDept: ['dept', 'branch', 'cse', 'it', 'department'],
                                                        quizEntryYear: ['year', '1st', '2nd', '3rd', '4th'],
                                                        quizEntrySection: ['section', 'sec', 'a', 'b', 'c']
                                                    };

                                                    searchParams.forEach((value, key) => {
                                                        if (key.startsWith('entry.')) {
                                                            extractedAny = true;
                                                            const lowerVal = value.toLowerCase();
                                                            for (const [field, keywords] of Object.entries(mappings)) {
                                                                if (keywords.some(k => k.length <= 1 ? lowerVal === k : lowerVal.includes(k))) {
                                                                    updatedSettings[field] = key;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    });

                                                    if (extractedAny) {
                                                        updatedSettings.quizFormUrl = url.split('?')[0];
                                                        alert("✨ Magic Extraction Successful!");
                                                    }
                                                } catch (err) { }
                                            }
                                            setQuizSettings(updatedSettings);
                                        }}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-800 pr-12"
                                    />
                                    {(quizSettings.quizFormUrl || '').includes('docs.google.com') && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 bg-slate-900 rounded-2xl space-y-4 text-left">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pre-fill Entry ID Mapping</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Name ID</label>
                                        <input
                                            type="text"
                                            value={quizSettings.quizEntryName}
                                            onChange={(e) => setQuizSettings({ ...quizSettings, quizEntryName: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Roll ID</label>
                                        <input
                                            type="text"
                                            value={quizSettings.quizEntryRoll}
                                            onChange={(e) => setQuizSettings({ ...quizSettings, quizEntryRoll: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Dept ID</label>
                                        <input
                                            type="text"
                                            value={quizSettings.quizEntryDept}
                                            onChange={(e) => setQuizSettings({ ...quizSettings, quizEntryDept: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Year ID</label>
                                        <input
                                            type="text"
                                            value={quizSettings.quizEntryYear}
                                            onChange={(e) => setQuizSettings({ ...quizSettings, quizEntryYear: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Section ID</label>
                                        <input
                                            type="text"
                                            value={quizSettings.quizEntrySection}
                                            onChange={(e) => setQuizSettings({ ...quizSettings, quizEntrySection: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase">Mobile ID</label>
                                        <input
                                            type="text"
                                            value={quizSettings.quizEntryMobile}
                                            onChange={(e) => setQuizSettings({ ...quizSettings, quizEntryMobile: e.target.value })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg outline-none font-mono text-xs text-white"
                                        />
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-500 font-medium italic">💡 Paste a pre-filled link above to auto-magically map these IDs.</p>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setShowQuizSettingsModal(false)} className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase hover:bg-slate-200 transition-all">Cancel</button>
                                <button onClick={handleSaveQuizSettings} disabled={savingQuizSettings || !quizSettings.quizFormUrl} className="flex-1 px-6 py-4 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {savingQuizSettings ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Change Event Organizer Modal */}
            <AnimatePresence>
                {isEditEventOrganizerModalOpen && eventToEditOrganizer && (
                    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditEventOrganizerModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between text-left">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 italic uppercase">Reassign Lead</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Transfer mission command safely</p>
                                </div>
                                <button onClick={() => setIsEditEventOrganizerModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 text-left">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Mission</p>
                                    <p className="text-sm font-black text-slate-800 uppercase">{eventToEditOrganizer.title}</p>
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Organizer</label>
                                    <div className="relative group">
                                        <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                        <select
                                            value={selectedNewOrganizer}
                                            onChange={(e) => setSelectedNewOrganizer(e.target.value)}
                                            className="w-full pl-11 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Select New Organizer</option>
                                            <option value="Admin">Admin (Main Command)</option>
                                            {organizers.map(org => (
                                                <option key={org.id} value={org.username}>{org.fullName} ({org.username})</option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 rotate-90" />
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdateOrganizer}
                                    disabled={isReassigning || !selectedNewOrganizer}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isReassigning ? 'Reassigning...' : 'Confirm Reassignment'}
                                    <ShieldCheck className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                @keyframes scan {
                    0%, 100% { top: 0%; }
                    50% { top: 100%; }
                }
                .animate-scan {
                    animation: scan 3s ease-in-out infinite;
                }
            `}</style>
        </div >
    );
};

export default AdminDashboard;
