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
    Menu,
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
    Bell,
    Edit,
    FileDown
} from 'lucide-react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, where, updateDoc, doc, increment, deleteDoc, getDoc, onSnapshot, limit, getCountFromServer, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Scanner } from '@yudiel/react-qr-scanner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import emailjs from '@emailjs/browser';
import ritLogo from '../../assets/rit-logo.png';
import techsparkLogo from '../../assets/techspark-logo.png';
import iqacLogo from '../../assets/iqac-logo.png';

const AdminDashboard = () => {
    const [admin, setAdmin] = useState(null);
    const [students, setStudents] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [coordinators, setCoordinators] = useState([]);
    const [isAssigningRole, setIsAssigningRole] = useState(null);
    const [coreSearchQuery, setCoreSearchQuery] = useState('');
    const [isAssigningFaculty, setIsAssigningFaculty] = useState(false);
    const [facultyForm, setFacultyForm] = useState({ name: 'Mr T.Pandiarajan', designation: 'Assistant Professor', department: 'CSE' });
    const [activeCoreTeamYear, setActiveCoreTeamYear] = useState(null);
    const [showNewYearModal, setShowNewYearModal] = useState(false);
    const [newYearInput, setNewYearInput] = useState('');
    const [expandedRole, setExpandedRole] = useState(null);

    // Combine years from database + default current year to ensure it's never empty
    const availableYears = [...new Set([...coordinators.map(c => c.academicYear), '2025-2026'])].filter(Boolean).sort().reverse();


    
    const CORE_ROLES = [
        "PRESIDENT",
        "VICE-PRESIDENT",
        "SECRETARY",
        "PRO",
        "EVENT ORGANISER",
        "EVENT CO-ORDINATOR",
        "PHOTOGRAPHY HEAD",
        "GRAPHIC DESIGNER",
        "REPORT HEAD",
        "SOCIAL MEDIA HEAD",
        "VOLUNTEER MANAGEMENT",
        "CREATIVE HEAD",
        "CONTENT WRITER"
    ];
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Organizer Management State
    const [organizers, setOrganizers] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [feedbackBase, setFeedbackBase] = useState([]);
    const [selectedEventDetails, setSelectedEventDetails] = useState(null);
    const [showEventDetailModal, setShowEventDetailModal] = useState(false);
    const [securityLogs, setSecurityLogs] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
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
        sectionWise: {},
        genderWise: {},
        pendingGenderUpdates: 0
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
    const [deptFilterBatch, setDeptFilterBatch] = useState('ALL');

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

    // Live Event Edit State
    const [isEditLiveEventModalOpen, setIsEditLiveEventModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState(null);
    const [liveEventEditData, setLiveEventEditData] = useState({
        time: '',
        venue: '',
        maxTeamSize: ''
    });
    const [isSavingLiveEventEdit, setIsSavingLiveEventEdit] = useState(false);

    // OD Generator State
    const [odLetterData, setOdLetterData] = useState({
        from: `THE COORDINATOR,\nTechSpark Club,\nRajalakshmi Institute of Technology,\nChennai.`,
        to: `THE HEAD OF DEPARTMENT,\n[Department Name],\nRajalakshmi Institute of Technology,\nChennai.`,
        salutation: 'Respected Mam/Sir,',
        subject: 'Requisition for On-Duty (OD) for TechSpark Club Members - Reg.',
        body: 'We are writing to bring to your kind notice that the following students, who are active members of the TechSpark Club, are required to attend and organize an upcoming event. We kindly request you to grant them On-Duty (OD) for the same.',
        students: [], // { name, rollNumber, dept, year }
        signatures: ['Club Coordinator', 'Class Incharge', 'HOD']
    });
    const [odInputRoll, setOdInputRoll] = useState('');
    const [isSearchingOdStudent, setIsSearchingOdStudent] = useState(false);

    // Reports Restructure Sub-tab State
    const [reportsSubTab, setReportsSubTab] = useState('strategic_reports');

    // Event Report Generator State
    const [selectedEventId, setSelectedEventId] = useState('');
    const [eventPoster, setEventPoster] = useState(null);
    const [approvalLetter, setApprovalLetter] = useState(null);
    const [eventImages, setEventImages] = useState([]); // Array of base64 images
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // New states for Event Report Generator updates
    const [eventGuestName, setEventGuestName] = useState('');
    const [eventGuestDesig, setEventGuestDesig] = useState('');
    const [eventGuestOrg, setEventGuestOrg] = useState('');
    const [eventWriteupSections, setEventWriteupSections] = useState([
        { title: 'Event Overview', content: '' }
    ]);
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [newSectionContent, setNewSectionContent] = useState('');
    const [sheetUrl, setSheetUrl] = useState('');
    const [sheetStartRow, setSheetStartRow] = useState(2);
    const [sheetEndRow, setSheetEndRow] = useState(10);
    const [sheetCertificates, setSheetCertificates] = useState([]);
    const [isFetchingSheet, setIsFetchingSheet] = useState(false);
    const [eventFeedbacks, setEventFeedbacks] = useState([]); // Loaded dynamically from database

    // Approval Letter Generator State
    const [approvalFormNo, setApprovalFormNo] = useState('RIT/IQAC/IIPC/IVR/F3.1R1');
    const [approvalDate, setApprovalDate] = useState(new Date().toLocaleDateString('en-GB').split('/').join('.')); // e.g. 29.06.2026
    const [approvalSubmissionTarget, setApprovalSubmissionTarget] = useState('Submitted for Vice Chairman Approval');
    const [approvalThrough, setApprovalThrough] = useState('Principal / RIT');
    const [approvalSubject, setApprovalSubject] = useState('Requesting Approval to conduct TechSpark Talent Quiz - 2nd Year');
    const [approvalBody, setApprovalBody] = useState('The TechSpark Club proposes to conduct "IQ League", a section-wise online talent assessment for all Second Year students during regular class hours. The event will be held on 23.1.26(Friday). The event may be conducted as per the proposed plan under the coordination of the respective class in-charges. We kindly request your approval to conduct this event and support the issuance of certificates and the proposed industry visit for selected students.');
    const [approvalDetails, setApprovalDetails] = useState([
        { label: 'Name of the Event', value: '"IQ League"' },
        { label: 'Event Duration', value: '20 Minutes' },
        { label: 'Participants Details', value: 'II Year EE(VLSI) Students' },
        { label: 'Type of the Event', value: 'Club Activity' },
        { label: 'Registration Fees', value: 'No' },
        { label: 'Budget Details', value: 'NA' },
        { label: 'Any other Remarks', value: 'Certificate required.' }
    ]);
    const [approvalSignatures, setApprovalSignatures] = useState([
        'Faculty Coordinator',
        'HOD',
        'Principal'
    ]);
    const [newDetailLabel, setNewDetailLabel] = useState('');
    const [newDetailValue, setNewDetailValue] = useState('');
    const [newSigName, setNewSigName] = useState('');
    const [isGeneratingApprovalLetter, setIsGeneratingApprovalLetter] = useState(false);

    // Annual Report Generator State
    const [annualAcademicYear, setAnnualAcademicYear] = useState('2025 - 2026');
    const [annualFacultyCoord, setAnnualFacultyCoord] = useState({ name: 'Dr. S. Devaprakash', designation: 'Assistant Professor', department: 'Information Technology' });
    const [annualPresident, setAnnualPresident] = useState({ name: 'Praveen R', designation: 'President', department: 'Computer Science & Engineering' });
    const [annualVicePresident, setAnnualVicePresident] = useState({ name: 'Thendral Raja K', designation: 'Vice President', department: 'Information Technology' });
    const [annualObjectives, setAnnualObjectives] = useState('To foster advanced agentic coding skills, organize section-wise talent contests, host workshops, and guide students towards industry-standard technical innovations.');
    const [annualEnrollment, setAnnualEnrollment] = useState([
        { year: 'I Year', count: 120 },
        { year: 'II Year', count: 98 },
        { year: 'III Year', count: 85 },
        { year: 'IV Year', count: 50 }
    ]);
    const [annualCoordinators, setAnnualCoordinators] = useState([
        { designation: 'Club Coordinator', name: 'Barath S' },
        { designation: 'Event Head', name: 'Monesh B' },
        { designation: 'Technical Lead', name: 'Kanishga M' }
    ]);
    const [annualEvents, setAnnualEvents] = useState([
        { date: '15.09.2025', title: 'TechSpark Orientation', objective: 'Introduce club structure to freshmen', workDone: 'Conducted live orientation session' },
        { date: '21.01.2026', title: 'IQ League Talent Quiz', objective: 'Assess VLSI domain fundamentals', workDone: 'Organized online platform test' }
    ]);
    const [isGeneratingAnnualReport, setIsGeneratingAnnualReport] = useState(false);

    // Inputs for adding to tables
    const [newEnrollYear, setNewEnrollYear] = useState('');
    const [newEnrollCount, setNewEnrollCount] = useState('');
    const [newCoordDesig, setNewCoordDesig] = useState('');
    const [newCoordName, setNewCoordName] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventObj, setNewEventObj] = useState('');
    const [newEventWork, setNewEventWork] = useState('');

    // Upload Helper Functions
    const handlePosterUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                setEventPoster(uploadEvent.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleApprovalLetterUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                setApprovalLetter(uploadEvent.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGalleryImagesUpload = (e) => {
        const files = Array.from(e.target.files);
        let loadedCount = 0;
        const tempImages = [];
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                tempImages.push(uploadEvent.target.result);
                loadedCount++;
                if (loadedCount === files.length) {
                    setEventImages(prev => [...prev, ...tempImages].slice(0, 4));
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const fetchDashboardData = (silent = false) => {
        console.log("Strategic Refresh Triggered", silent ? "(silent)" : "");
        initDashboardSync(silent);
    };

    // Dynamic extraction helper for missing student data
    const getStudentExtendedData = (s) => {
        let year = s.yearOfStudy || 'Unknown';
        let admissionYear = s.admissionYear || 'Unknown';
        let dept = s.department || 'Unknown';

        if ((year === 'Unknown' || admissionYear === 'Unknown' || dept === 'Unknown') && s.email) {
            try {
                const email = s.email.toLowerCase();
                if (email && email.includes('@')) {
                    const [local, domain] = email.split('@');
                    if (domain) {
                        const domainSegments = domain.split('.');

                        if (admissionYear === 'Unknown') {
                            const yearMatch4 = local.match(/(20[1-2][0-9])/);
                            if (yearMatch4) {
                                admissionYear = parseInt(yearMatch4[0]);
                            } else {
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

                        if (dept === 'Unknown') {
                            if (domainSegments.length === 4 && domainSegments[1] === 'ritchennai') {
                                dept = domainSegments[0].toUpperCase();
                            } else {
                                const deptCodes = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSBS', 'BME', 'RA', 'FT'];
                                for (const code of deptCodes) {
                                    if (local.toUpperCase().includes(code)) {
                                        dept = code;
                                        break;
                                    }
                                }
                            }
                        }

                        if (admissionYear !== 'Unknown' && (year === 'Unknown' || !year)) {
                            const now = new Date();
                            const academicYearRef = (now.getMonth() + 1) < 6 ? now.getFullYear() - 1 : now.getFullYear();
                            const calc = academicYearRef - parseInt(admissionYear) + 1;
                            if (calc > 0 && calc <= 4) year = calc.toString();
                            else if (calc > 4) year = 'Alumni';
                            else if (calc <= 0) year = '1';
                        }
                    }
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

    // Scroll to top when changing tabs
    useEffect(() => {
        // A small timeout ensures the DOM has updated the new tab's content before scrolling
        const timer = setTimeout(() => {
            const mainContainer = document.getElementById('main-scroll-container');
            if (mainContainer) {
                // Using instant scroll (scrollTop = 0) is more reliable for tab switching than smooth scrolling
                mainContainer.scrollTop = 0;
            }
        }, 10);
        
        return () => clearTimeout(timer);
    }, [activeTab]);

    useEffect(() => {
        try {
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                navigate('/admin/login');
                return;
            }
            setAdmin(JSON.parse(adminToken));
        } catch (e) {
            console.error("Auth Token Error:", e);
            localStorage.removeItem('adminToken');
            navigate('/admin/login');
            return;
        }

        initDashboardSync();
        return () => { };
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

        const genderMap = {};
        let pendingGenderUpdates = 0;

        allStudents.forEach(s => {
            totalXP += (s.points || 0);
            totalBadges += (s.badges?.length || 0);

            const { year, batch, dept } = getStudentExtendedData(s);

            deptMap[dept] = (deptMap[dept] || 0) + 1;
            yearMap[year] = (yearMap[year] || 0) + 1;
            batchMap[batch] = (batchMap[batch] || 0) + 1;
            sectionMap[s.section || 'Unknown'] = (sectionMap[s.section || 'Unknown'] || 0) + 1;

            if (s.gender) {
                genderMap[s.gender] = (genderMap[s.gender] || 0) + 1;
            } else {
                pendingGenderUpdates++;
            }
        });

        setStats(prev => ({
            ...prev,
            totalXP: totalXP,
            totalBadges: totalBadges
        }));

        setAnalytics({
            deptWise: deptMap,
            yearWise: yearMap,
            batchWise: batchMap,
            sectionWise: sectionMap,
            genderWise: genderMap,
            pendingGenderUpdates: pendingGenderUpdates
        });

        // Update active students list (top 10 for overview)
        setStudents(allStudents.slice(0, 10));

    }, [allStudents, events]);

    // Auto-prepopulate annual report data when entering the generator tab
    useEffect(() => {
        if (reportsSubTab === 'annual_report_generator') {
            // 1. Prepopulate enrollment from analytics.yearWise
            if (analytics && analytics.yearWise && Object.keys(analytics.yearWise).length > 0) {
                const mapped = Object.entries(analytics.yearWise).map(([year, count]) => ({
                    year: `${year} Year`,
                    count: count
                }));
                setAnnualEnrollment(mapped.sort((a, b) => a.year.localeCompare(b.year)));
            }

            // 2. Prepopulate student coordinators from organizers list
            if (organizers && organizers.length > 0) {
                const mappedCoords = organizers
                    .filter(o => o.role && !o.role.toLowerCase().includes('faculty') && !o.role.toLowerCase().includes('advisor'))
                    .map(o => ({
                        designation: o.role || 'Coordinator',
                        name: o.fullName
                    }));
                if (mappedCoords.length > 0) {
                    setAnnualCoordinators(mappedCoords);
                }
            }

            // 3. Prepopulate events from events list
            if (events && events.length > 0) {
                const mappedEvents = events.map(e => ({
                    date: e.date || '',
                    title: e.title || '',
                    objective: e.objective || 'Promote domain knowledge.',
                    workDone: e.description || 'Conducted successfully.'
                }));
                setAnnualEvents(mappedEvents);
            }
        }
    }, [reportsSubTab, analytics, organizers, events]);

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
            doc.addImage(rit, 'PNG', 15, 23, 65, 15);
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

            doc.addImage(rit, 'PNG', 15, 23, 65, 15);
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
                    `${((count / (stats.totalMembers || 1)) * 100).toFixed(1)}%`
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

            doc.addImage(rit, 'PNG', 15, 23, 65, 15);
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

    const handleAddOdStudent = async () => {
        if (!odInputRoll.trim()) return;
        setIsSearchingOdStudent(true);
        try {
            // Check local allStudents first
            let student = allStudents.find(s => s.rollNumber?.toLowerCase() === odInputRoll.toLowerCase() || s.id?.toLowerCase() === odInputRoll.toLowerCase());

            if (!student) {
                // If not found locally, try Firestore (though allStudents should have it)
                const q = query(collection(db, 'users'), where('rollNumber', '==', odInputRoll));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    student = { id: snap.docs[0].id, ...snap.docs[0].data() };
                }
            }

            if (student) {
                const alreadyExists = odLetterData.students.find(s => s.rollNumber === student.rollNumber);
                if (alreadyExists) {
                    alert('Student already added to the list.');
                } else {
                    const { year, dept } = getStudentExtendedData(student);
                    setOdLetterData(prev => ({
                        ...prev,
                        students: [...prev.students, {
                            name: student.fullName,
                            rollNumber: student.rollNumber || student.id,
                            dept: dept,
                            year: year,
                            section: student.section || '-'
                        }]
                    }));
                    setOdInputRoll('');
                }
            } else {
                alert('Student not found. Please verify the Register Number.');
            }
        } catch (e) {
            console.error(e);
            alert('Error fetching student data.');
        } finally {
            setIsSearchingOdStudent(false);
        }
    };

    const handleRemoveOdStudent = (roll) => {
        setOdLetterData(prev => ({
            ...prev,
            students: prev.students.filter(s => s.rollNumber !== roll)
        }));
    };

    const downloadAnnualReportPDF = async () => {
        setIsGeneratingAnnualReport(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            // Load Logos
            const loadImg = (path) => new Promise(res => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = path;
            });
            const [rit, ts] = await Promise.all([loadImg(ritLogo), loadImg(techsparkLogo)]);

            // Helper to draw standard header
            const drawPageHeader = () => {
                if (rit) doc.addImage(rit, 'PNG', 15, 10, 48, 11);
                if (ts) doc.addImage(ts, 'PNG', pageWidth - 50, 8, 35, 15);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.8);
                doc.line(15, 25, pageWidth - 15, 25);
            };

            // ================= PAGE 1: COVER PAGE =================
            drawPageHeader();

            doc.setFont('times', 'bold');
            
            // TechSpark Club title
            doc.setFontSize(28);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text('TECHSPARK CLUB', pageWidth / 2, pageHeight / 3 + 10, { align: 'center' });

            // Divider bar
            doc.setFillColor(37, 99, 235); // blue-600
            doc.rect(pageWidth / 2 - 35, pageHeight / 3 + 18, 70, 1.5, 'F');

            // Annual Report Subtitle
            doc.setFontSize(20);
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text('ANNUAL REPORT', pageWidth / 2, pageHeight / 2, { align: 'center' });

            // Academic Year Subtitle
            doc.setFontSize(15);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(`ACADEMIC YEAR ${annualAcademicYear.toUpperCase()}`, pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });

            // ================= PAGE 2: LEADERSHIP & OBJECTIVES =================
            doc.addPage();
            drawPageHeader();

            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('CLUB LEADERSHIP & CORE EXECUTIVE COMMITTEE', pageWidth / 2, 35, { align: 'center' });

            // Leadership Table
            autoTable(doc, {
                startY: 42,
                theme: 'striped',
                head: [['ROLE', 'OFFICER NAME', 'DESIGNATION', 'DEPARTMENT']],
                body: [
                    ['Faculty Coordinator', annualFacultyCoord.name.toUpperCase(), annualFacultyCoord.designation, annualFacultyCoord.department],
                    ['Club President', annualPresident.name.toUpperCase(), annualPresident.designation, annualPresident.department],
                    ['Club Vice President', annualVicePresident.name.toUpperCase(), annualVicePresident.designation, annualVicePresident.department]
                ],
                headStyles: { fillColor: [30, 41, 59], font: 'times', fontStyle: 'bold', fontSize: 10 },
                bodyStyles: { font: 'times', fontSize: 9.5 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 40 }
                }
            });

            // Objectives Section
            const objStartY = doc.lastAutoTable.finalY + 15;
            doc.setFont('times', 'bold');
            doc.setFontSize(12);
            doc.text('STATEMENT OF OBJECTIVES', 15, objStartY);
            
            doc.setFont('times', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(51, 65, 85);
            const splitObjectives = doc.splitTextToSize(annualObjectives, pageWidth - 30);
            doc.text(splitObjectives, 15, objStartY + 8);

            // ================= PAGE 3: ENROLLMENT DETAILS =================
            doc.addPage();
            drawPageHeader();

            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('CLUB MEMBERSHIP ENROLLMENT METRICS', pageWidth / 2, 35, { align: 'center' });

            const totalEnrollmentCount = annualEnrollment.reduce((acc, curr) => acc + Number(curr.count || 0), 0);

            // Enrollment Table
            autoTable(doc, {
                startY: 42,
                theme: 'grid',
                head: [['ACADEMIC YEAR / STUDY SEGMENT', 'ENROLLED MEMBERS COUNT']],
                body: [
                    ...annualEnrollment.map(e => [e.year.toUpperCase(), e.count]),
                    [{ content: 'TOTAL ACTIVE ENROLLED MEMBERS', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: totalEnrollmentCount, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]
                ],
                headStyles: { fillColor: [37, 99, 235], font: 'times', fontStyle: 'bold', fontSize: 10, halign: 'center' },
                bodyStyles: { font: 'times', fontSize: 10 },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { halign: 'center' }
                }
            });

            // ================= PAGE 4: COORDINATORS LIST =================
            doc.addPage();
            drawPageHeader();

            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('STUDENT EXECUTION COMMITTEE (COORDINATORS)', pageWidth / 2, 35, { align: 'center' });

            // Coordinators Table
            autoTable(doc, {
                startY: 42,
                theme: 'striped',
                head: [['S.NO', 'DESIGNATION', 'STUDENT LEADER NAME']],
                body: annualCoordinators.map((c, idx) => [idx + 1, c.designation.toUpperCase(), c.name.toUpperCase()]),
                headStyles: { fillColor: [79, 70, 229], font: 'times', fontStyle: 'bold', fontSize: 10 },
                bodyStyles: { font: 'times', fontSize: 9.5 },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center' },
                    1: { cellWidth: 60, fontStyle: 'bold' }
                }
            });

            // ================= PAGE 5: EVENTS ORGANIZED =================
            doc.addPage();
            drawPageHeader();

            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('EVENTS ORGANIZED IN THIS ACADEMIC YEAR', pageWidth / 2, 35, { align: 'center' });

            // Events Table
            autoTable(doc, {
                startY: 42,
                theme: 'grid',
                head: [['S.NO', 'DATE', 'EVENT TITLE', 'OBJECTIVE / INTENT', 'WORK DONE / DESCRIPTION']],
                body: annualEvents.map((e, idx) => [
                    idx + 1,
                    e.date,
                    e.title.toUpperCase(),
                    e.objective,
                    e.workDone
                ]),
                headStyles: { fillColor: [15, 23, 42], font: 'times', fontStyle: 'bold', fontSize: 9.5, halign: 'center' },
                bodyStyles: { font: 'times', fontSize: 9, valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'center' },
                    1: { cellWidth: 22, halign: 'center' },
                    2: { cellWidth: 42, fontStyle: 'bold' },
                    3: { cellWidth: 50 },
                    4: { cellWidth: 54 }
                }
            });

            doc.save(`TechSpark_Annual_Report_${annualAcademicYear.replace(/\s+/g, '')}.pdf`);
            setIsGeneratingAnnualReport(false);
        } catch (error) {
            console.error('Error generating annual report PDF:', error);
            alert('An error occurred during PDF generation.');
            setIsGeneratingAnnualReport(false);
        }
    };

    const downloadApprovalLetterPDF = async () => {
        setIsGeneratingApprovalLetter(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            // Load Logos
            const loadImg = (path) => new Promise(res => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = path;
            });
            const [rit, iqac] = await Promise.all([loadImg(ritLogo), loadImg(iqacLogo)]);

            // Left Header: RIT Logo (Cropped content box, aligned properly)
            if (rit) {
                doc.addImage(rit, 'PNG', 15, 10, 48, 11);
            }

            // Right Header: IQAC Logo
            if (iqac) {
                doc.addImage(iqac, 'PNG', pageWidth - 42, 10, 27, 11);
            }

            // Thin Horizontal Divider Line
            doc.setDrawColor(51, 65, 85); // slate-700
            doc.setLineWidth(0.8);
            doc.line(15, 25, pageWidth - 15, 25);

            // Form No & Date Row (Times font, size 11)
            doc.setFont('times', 'italic');
            doc.setFontSize(11);
            doc.setTextColor(71, 85, 105);
            doc.text(`Form No.: ${approvalFormNo}`, 15, 32);

            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            doc.text(`Date: ${approvalDate}`, pageWidth - 15, 32, { align: 'right' });

            // Submitted for Vice Chairman Approval (Times font, size 14)
            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text(approvalSubmissionTarget.toUpperCase(), pageWidth / 2, 42, { align: 'center' });
            // Underline it
            const submissionWidth = doc.getTextWidth(approvalSubmissionTarget.toUpperCase());
            doc.line(pageWidth / 2 - submissionWidth / 2, 44, pageWidth / 2 + submissionWidth / 2, 44);

            // Through Line (Times font, size 11)
            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            doc.text(`Through: ${approvalThrough}`, 15, 52);

            // Subject Line (Italic + Bold, size 11)
            doc.setFont('times', 'bolditalic');
            doc.setFontSize(11);
            const subText = `Sub:    ${approvalSubject}`;
            const splitSub = doc.splitTextToSize(subText, pageWidth - 30);
            let subCursorY = 60;
            splitSub.forEach((line, index) => {
                doc.text(line, 15, subCursorY + (index * 6));
            });
            const subHeight = splitSub.length * 6;

            // Rich Text Paragraph Drawing Helper
            const drawFormattedParagraph = (text, x, y, maxWidth, lineHeight = 7, defaultFont = 'times', fontSize = 11) => {
                const words = text.split(/(\s+)/);
                let lines = [];
                let currentLine = [];
                let currentLineWidth = 0;
                
                let isBold = false;
                let isItalic = false;

                const getWordWidth = (word) => {
                    const parts = word.split(/(<\/?b>|<\/?u>|<\/?i>)/g);
                    let width = 0;
                    let tempBold = isBold;
                    let tempItalic = isItalic;
                    
                    parts.forEach(part => {
                        if (part === '<b>') { tempBold = true; }
                        else if (part === '</b>') { tempBold = false; }
                        else if (part === '<i>') { tempItalic = true; }
                        else if (part === '</i>') { tempItalic = false; }
                        else if (part !== '<u>' && part !== '</u>') {
                            let style = 'normal';
                            if (tempBold && tempItalic) style = 'bolditalic';
                            else if (tempBold) style = 'bold';
                            else if (tempItalic) style = 'italic';
                            
                            doc.setFont(defaultFont, style);
                            doc.setFontSize(fontSize);
                            width += doc.getTextWidth(part);
                        }
                    });
                    return width;
                };

                words.forEach(word => {
                    if (word.trim() === '' && word.includes('\n')) {
                        lines.push(currentLine);
                        currentLine = [];
                        currentLineWidth = 0;
                        return;
                    }
                    
                    const wordWidth = getWordWidth(word);
                    if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                        lines.push(currentLine);
                        currentLine = [word];
                        currentLineWidth = wordWidth;
                    } else {
                        currentLine.push(word);
                        currentLineWidth += wordWidth;
                    }
                });
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }

                let cursorY = y;
                isBold = false;
                isItalic = false;
                let isUnderline = false;

                lines.forEach(line => {
                    let cursorX = x;
                    const lineText = line.join('');
                    const parts = lineText.split(/(<\/?b>|<\/?u>|<\/?i>)/g);
                    
                    parts.forEach(part => {
                        if (part === '<b>') { isBold = true; }
                        else if (part === '</b>') { isBold = false; }
                        else if (part === '<i>') { isItalic = true; }
                        else if (part === '</i>') { isItalic = false; }
                        else if (part === '<u>') { isUnderline = true; }
                        else if (part === '</u>') { isUnderline = false; }
                        else {
                            let style = 'normal';
                            if (isBold && isItalic) style = 'bolditalic';
                            else if (isBold) style = 'bold';
                            else if (isItalic) style = 'italic';
                            
                            doc.setFont(defaultFont, style);
                            doc.setFontSize(fontSize);
                            doc.text(part, cursorX, cursorY);
                            
                            const w = doc.getTextWidth(part);
                            if (isUnderline) {
                                doc.line(cursorX, cursorY + 0.8, cursorX + w, cursorY + 0.8);
                            }
                            cursorX += w;
                        }
                    });
                    cursorY += lineHeight;
                });

                return cursorY;
            };

            // Body Paragraph (Times font, size 11, line spacing 7)
            let bodyCursorY = 60 + subHeight + 6;
            let endBodyY = drawFormattedParagraph(approvalBody, 15, bodyCursorY, pageWidth - 30, 7, 'times', 11);

            // Details section header
            let detailsCursorY = endBodyY + 6;
            doc.setFont('times', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text('The Details of the event are as follows:', 15, detailsCursorY);

            // Details Table List (Times font, size 11, colon aligned)
            let listCursorY = detailsCursorY + 7;
            approvalDetails.forEach((detail, index) => {
                doc.setFont('times', 'normal');
                doc.setFontSize(11);
                doc.text(`${index + 1}.`, 20, listCursorY);
                doc.text(detail.label, 26, listCursorY);
                doc.text(':', 75, listCursorY);
                doc.text(detail.value, 78, listCursorY);
                listCursorY += 7;
            });

            // Thanking you
            let closingCursorY = listCursorY + 10;
            doc.setFont('times', 'normal');
            doc.setFontSize(11);
            doc.text('Thanking you', pageWidth / 2, closingCursorY, { align: 'center' });

            // Approved / Not Approved
            let approvalStatusCursorY = closingCursorY + 12;
            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            doc.text('Approved / Not Approved', pageWidth / 2, approvalStatusCursorY, { align: 'center' });

            // Signatures
            let sigsCursorY = approvalStatusCursorY + 24;
            if (approvalSignatures.length > 0) {
                const colWidth = (pageWidth - 30) / approvalSignatures.length;
                doc.setFont('times', 'bold');
                doc.setFontSize(11);
                approvalSignatures.forEach((sig, idx) => {
                    const xPos = 15 + (idx * colWidth) + (colWidth / 2);
                    doc.text(sig, xPos, sigsCursorY, { align: 'center' });
                });
            }

            doc.save(`Approval_Letter_${approvalDate.split('.').join('_')}.pdf`);
            setIsGeneratingApprovalLetter(false);
        } catch (error) {
            console.error('Error generating approval letter:', error);
            alert('An error occurred during PDF generation.');
            setIsGeneratingApprovalLetter(false);
        }
    };


    const downloadEventReportPDF = async () => {
        if (!selectedEventId) {
            alert('Please select an event first.');
            return;
        }
        setIsGeneratingReport(true);
        try {
            const event = events.find(e => e.id === selectedEventId);
            if (!event) {
                alert('Event not found.');
                setIsGeneratingReport(false);
                return;
            }

            // Fetch registrations for this event
            const regsSnap = await getDocs(
                query(collection(db, 'registrations'), where('eventId', '==', selectedEventId))
            );
            const eventRegs = regsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch feedback for this event
            const feedbackSnap = await getDocs(
                query(collection(db, 'feedback'), where('eventId', '==', selectedEventId))
            );
            const eventFeedbacks = feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            // Load Logos Helper
            const loadImg = (path) => new Promise(res => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = path;
            });

            const [rit, ts] = await Promise.all([loadImg(ritLogo), loadImg(techsparkLogo)]);

            // Helper to draw standard header
            const drawPageHeader = () => {
                if (rit) doc.addImage(rit, 'PNG', 15, 10, 48, 11);
                if (ts) doc.addImage(ts, 'PNG', pageWidth - 50, 8, 35, 15);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.8);
                doc.line(15, 25, pageWidth - 15, 25);
            };

            // ================= PAGE 1: COVER PAGE (Clean & Formal) =================
            drawPageHeader();

            doc.setFont('times', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text('TECHSPARK CLUB', pageWidth / 2, 60, { align: 'center' });

            doc.setFont('times', 'italic');
            doc.setFontSize(14);
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text('OFFICIAL EVENT COMPLIANCE & IMPACT REPORT', pageWidth / 2, 70, { align: 'center' });

            // Accent Line
            doc.setFillColor(37, 99, 235); // blue-600
            doc.rect(pageWidth / 2 - 25, 78, 50, 1, 'F');

            // Metadata Box/Frame Table
            const coverMeta = [
                ['EVENT TITLE', (event.title || event.eventName || 'N/A').toUpperCase()],
                ['DATE OF CONDUCT', event.date || 'N/A'],
                ['EVENT VENUE', event.venue || 'N/A'],
                ['CHIEF GUEST / SPEAKER', (eventGuestName || 'N/A').toUpperCase()],
                ['FACULTY COORDINATOR', 'DR. S. DEVAPRAKASH'],
                ['ORGANIZING COMPLIANCE', 'TECHSPARK CLUB, RIT CHENNAI'],
                ['DOCUMENT GENERATED', new Date().toLocaleDateString('en-US')]
            ];

            autoTable(doc, {
                startY: 95,
                margin: { left: 30, right: 30 },
                body: coverMeta,
                theme: 'plain',
                styles: {
                    font: 'times',
                    fontSize: 10.5,
                    cellPadding: 5,
                    textColor: [51, 65, 85] // slate-700
                },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 55 }
                },
                didParseCell: (data) => {
                    data.cell.styles.cellPadding = 6;
                }
            });

            // Frame border around metadata
            const finalY = doc.lastAutoTable.finalY;
            doc.setDrawColor(203, 213, 225); // slate-300
            doc.setLineWidth(0.5);
            doc.rect(30, 95, pageWidth - 60, finalY - 95);

            // Footer
            doc.setFont('times', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', pageWidth / 2, pageHeight - 15, { align: 'center' });

            // ================= PAGE 2: METRICS MATRIX & GUEST PROFILE =================
            doc.addPage();
            drawPageHeader();

            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('EXECUTIVE METRICS MATRIX & SPEAKER PROFILE', pageWidth / 2, 35, { align: 'center' });

            let currentY = 45;

            // Guest Profile Card
            if (eventGuestName) {
                doc.setFont('times', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(37, 99, 235); // blue-600
                doc.text('CHIEF GUEST / INVITED SPEAKER PROFILE', 15, currentY);

                const guestMeta = [
                    ['GUEST NAME', eventGuestName.toUpperCase()],
                    ['DESIGNATION', eventGuestDesig || 'N/A'],
                    ['ORGANIZATION', eventGuestOrg || 'N/A']
                ];

                autoTable(doc, {
                    startY: currentY + 4,
                    body: guestMeta,
                    theme: 'striped',
                    styles: { font: 'times', fontSize: 10, cellPadding: 5 },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 40 }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 15;
            }

            // Attendance and Registration Matrix
            doc.setFont('times', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(37, 99, 235);
            doc.text('PARTICIPATION TELEMETRY MATRIX', 15, currentY);

            const totalRegistered = eventRegs.length;
            const attendedCount = eventRegs.filter(r => r.isAttended || r.status === 'Present').length;
            const absentCount = totalRegistered - attendedCount;
            const attendancePct = totalRegistered > 0 ? ((attendedCount / totalRegistered) * 100).toFixed(1) : '0.0';

            const matrixData = [
                ['TOTAL STUDENTS REGISTERED', totalRegistered.toString()],
                ['VERIFIED ATTENDEES (PRESENT)', attendedCount.toString()],
                ['ABSENT REGISTRATIONS', absentCount.toString()],
                ['ATTENDANCE COMPLIANCE RATE', `${attendancePct}%`]
            ];

            autoTable(doc, {
                startY: currentY + 4,
                body: matrixData,
                theme: 'grid',
                styles: { font: 'times', fontSize: 10, cellPadding: 6 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 80, fillColor: [248, 250, 252] },
                    1: { halign: 'center', fontStyle: 'bold' }
                },
                didParseCell: (data) => {
                    if (data.column.index === 1 && data.row.index === 3) {
                        data.cell.styles.textColor = [22, 163, 74]; // green-600
                        data.cell.styles.fillColor = [240, 253, 244];
                    }
                }
            });

            // ================= PAGE 3: EVENT POSTER (If uploaded) =================
            if (eventPoster) {
                doc.addPage();
                drawPageHeader();

                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(30, 41, 59);
                doc.text('OFFICIAL EVENT POSTER', 15, 38);

                try {
                    doc.addImage(eventPoster, 'JPEG', 20, 46, 170, 230, undefined, 'FAST');
                } catch (e) {
                    console.error('Error drawing poster:', e);
                    doc.setFont('times', 'italic');
                    doc.setFontSize(11);
                    doc.text('Failed to render poster image.', 15, 55);
                }
            }

            // ================= PAGE 4: APPROVAL LETTER (If uploaded) =================
            if (approvalLetter) {
                doc.addPage();
                drawPageHeader();

                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(30, 41, 59);
                doc.text('OFFICIAL EVENT APPROVAL REQUISITION', 15, 38);

                try {
                    doc.addImage(approvalLetter, 'JPEG', 20, 46, 170, 230, undefined, 'FAST');
                } catch (e) {
                    console.error('Error drawing approval:', e);
                    doc.setFont('times', 'italic');
                    doc.setFontSize(11);
                    doc.text('Failed to render approval letter image.', 15, 55);
                }
            }

            // ================= PAGE 5: EVENT WRITE-UP & SUBHEADINGS =================
            doc.addPage();
            drawPageHeader();

            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('DETAILED EVENT EXECUTIVE REPORT', pageWidth / 2, 35, { align: 'center' });

            let writeupY = 45;

            eventWriteupSections.forEach((section, sIdx) => {
                // Measure section content to check if it fits, else add page
                doc.setFont('times', 'bold');
                doc.setFontSize(12);
                const titleText = `${sIdx + 1}. ${section.title.toUpperCase()}`;
                
                // Add page if near bottom
                if (writeupY > pageHeight - 35) {
                    doc.addPage();
                    drawPageHeader();
                    writeupY = 35;
                }

                doc.setTextColor(37, 99, 235);
                doc.text(titleText, 15, writeupY);
                writeupY += 7;

                doc.setFont('times', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(51, 65, 85);
                
                const splitContent = doc.splitTextToSize(section.content || 'No details provided for this section.', pageWidth - 30);
                
                splitContent.forEach(line => {
                    if (writeupY > pageHeight - 20) {
                        doc.addPage();
                        drawPageHeader();
                        writeupY = 35;
                        doc.setFont('times', 'normal');
                        doc.setFontSize(11);
                        doc.setTextColor(51, 65, 85);
                    }
                    doc.text(line, 15, writeupY);
                    writeupY += 6;
                });

                writeupY += 8; // Spacing between sections
            });

            // ================= PAGE 6: CERTIFICATE ISSUANCE TABLE =================
            if (sheetCertificates.length > 0) {
                doc.addPage();
                drawPageHeader();

                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(15, 23, 42);
                doc.text('CERTIFICATE DISTRIBUTION REGISTER', pageWidth / 2, 35, { align: 'center' });

                const certRows = sheetCertificates.map((c, idx) => [
                    idx + 1,
                    c.rollNumber.toUpperCase(),
                    c.name.toUpperCase(),
                    c.role.toUpperCase(),
                    c.certId.toUpperCase()
                ]);

                autoTable(doc, {
                    startY: 42,
                    theme: 'striped',
                    head: [['S.NO', 'ROLL NUMBER', 'STUDENT NAME', 'EVENT ROLE', 'CERTIFICATE ID']],
                    body: certRows,
                    headStyles: { fillColor: [79, 70, 229], font: 'times', fontStyle: 'bold', fontSize: 9.5 },
                    bodyStyles: { font: 'times', fontSize: 9 },
                    columnStyles: {
                        0: { cellWidth: 15, halign: 'center' },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 60 },
                        3: { cellWidth: 35, fontStyle: 'bold' },
                        4: { cellWidth: 40 }
                    }
                });
            }

            // ================= PAGE 7: PARTICIPANT ATTENDANCE SHEET =================
            doc.addPage();
            drawPageHeader();

            doc.setFont('times', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('PARTICIPANT ATTENDANCE LEDGER', pageWidth / 2, 35, { align: 'center' });

            const tableRows = eventRegs.map((reg, index) => [
                index + 1,
                (reg.studentName || 'N/A').toUpperCase(),
                reg.studentRoll || reg.rollNumber || 'N/A',
                (reg.studentDept || reg.department || 'N/A').toUpperCase(),
                reg.studentYear || reg.yearOfStudy || 'N/A',
                reg.studentSection || reg.section || '-',
                reg.isAttended || reg.status === 'Present' ? 'PRESENT' : 'ABSENT'
            ]);

            autoTable(doc, {
                startY: 42,
                theme: 'striped',
                head: [['S.NO', 'STUDENT NAME', 'ROLL NUMBER', 'DEPT', 'YEAR', 'SEC', 'STATUS']],
                body: tableRows,
                styles: { font: 'times', fontSize: 8.5, cellPadding: 3.5 },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
                columnStyles: {
                    0: { halign: 'center' },
                    2: { halign: 'center' },
                    6: { fontStyle: 'bold' }
                },
                didParseCell: (data) => {
                    if (data.column.index === 6 && data.cell.section === 'body') {
                        if (data.cell.text[0] === 'PRESENT') {
                            data.cell.styles.textColor = [22, 163, 74];
                        } else {
                            data.cell.styles.textColor = [220, 38, 38];
                        }
                    }
                }
            });

            // ================= PAGE 8: FEEDBACK INTELLIGENCE =================
            if (eventFeedbacks.length > 0) {
                doc.addPage();
                drawPageHeader();

                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(15, 23, 42);
                doc.text('PARTICIPANT FEEDBACK INTELLIGENCE', pageWidth / 2, 35, { align: 'center' });

                const avgRating = (eventFeedbacks.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0) / (eventFeedbacks.length || 1)).toFixed(1);
                
                doc.setFont('times', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(71, 85, 105);
                doc.text(`Total Feedback Logs: ${eventFeedbacks.length}    |    Average Assessment Score: ${avgRating} / 5.0`, 15, 43);

                // Feedback Highlights Table
                const feedbackComments = eventFeedbacks
                    .filter(f => f.comment || f.feedback)
                    .map((f, index) => [
                        index + 1,
                        f.studentRoll || 'N/A',
                        `★ ${f.rating || '-'}`,
                        f.comment || f.feedback || 'N/A'
                    ]);

                autoTable(doc, {
                    startY: 48,
                    theme: 'striped',
                    head: [['S.NO', 'ROLL NUMBER', 'RATING', 'STUDENT INSIGHTS & REMARKS']],
                    body: feedbackComments,
                    headStyles: { fillColor: [15, 23, 42], font: 'times', fontStyle: 'bold', fontSize: 9.5 },
                    bodyStyles: { font: 'times', fontSize: 9 },
                    columnStyles: {
                        0: { cellWidth: 15, halign: 'center' },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 20, fontStyle: 'bold', textColor: [234, 179, 8] },
                        3: { cellWidth: 120 }
                    }
                });
            }

            // ================= PAGE 9: PHOTOGRAPHS GALLERY =================
            if (eventImages.length > 0) {
                doc.addPage();
                drawPageHeader();

                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(30, 41, 59);
                doc.text('EVENT PHOTOGRAPHS GALLERY', 15, 38);

                const positions = [
                    { x: 15, y: 46, w: 85, h: 90 },
                    { x: 110, y: 46, w: 85, h: 90 },
                    { x: 15, y: 150, w: 85, h: 90 },
                    { x: 110, y: 150, w: 85, h: 90 }
                ];

                eventImages.forEach((imgBase64, idx) => {
                    if (idx < positions.length) {
                        const pos = positions[idx];
                        try {
                            doc.addImage(imgBase64, 'JPEG', pos.x, pos.y, pos.w, pos.h, undefined, 'FAST');
                            doc.setDrawColor(200);
                            doc.setLineWidth(0.2);
                            doc.rect(pos.x, pos.y, pos.w, pos.h);
                        } catch (e) {
                            console.error('Error drawing gallery image:', e);
                        }
                    }
                });
            }

            doc.save(`Event_Report_${event.title.replace(/\s+/g, '_')}.pdf`);
            setIsGeneratingReport(false);
        } catch (error) {
            console.error('Error generating event report PDF:', error);
            alert('An error occurred during report generation. Please try again.');
            setIsGeneratingReport(false);
        }
    };

    const fetchCertificateData = async () => {
        if (!sheetUrl) {
            alert('Please enter a Google Sheets URL first.');
            return;
        }
        setIsFetchingSheet(true);
        try {
            const regex = /\/d\/([a-zA-Z0-9-_]+)/;
            const match = sheetUrl.match(regex);
            if (!match || !match[1]) {
                alert('Invalid Google Sheets URL format. Make sure it contains /d/SPREADSHEET_ID.');
                setIsFetchingSheet(false);
                return;
            }
            const sheetId = match[1];
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
            const res = await fetch(csvUrl);
            const text = await res.text();
            
            const parseCSV = (csvText) => {
                const lines = [];
                let row = [""];
                let inQuotes = false;
                for (let i = 0; i < csvText.length; i++) {
                    const c = csvText[i];
                    const next = csvText[i + 1];
                    if (c === '"') {
                        if (inQuotes && next === '"') {
                            row[row.length - 1] += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (c === ',') {
                        if (inQuotes) {
                            row[row.length - 1] += c;
                        } else {
                            row.push("");
                        }
                    } else if (c === '\r' || c === '\n') {
                        if (inQuotes) {
                            row[row.length - 1] += c;
                        } else {
                            if (c === '\r' && next === '\n') {
                                i++;
                            }
                            lines.push(row);
                            row = [""];
                        }
                    } else {
                        row[row.length - 1] += c;
                    }
                }
                if (row.length > 1 || row[0] !== "") {
                    lines.push(row);
                }
                return lines;
            };

            const rows = parseCSV(text);
            if (rows.length === 0) {
                alert('No data found in the sheet.');
                setIsFetchingSheet(false);
                return;
            }

            const startIdx = Math.max(1, sheetStartRow - 1);
            const endIdx = Math.min(rows.length, sheetEndRow);
            const parsedCerts = [];

            for (let idx = startIdx; idx < endIdx; idx++) {
                const r = rows[idx];
                if (r && r.length >= 4) {
                    parsedCerts.push({
                        rollNumber: r[0]?.trim() || '',
                        name: r[1]?.trim() || '',
                        role: r[2]?.trim() || 'Participant',
                        certId: r[3]?.trim() || ''
                    });
                }
            }

            setSheetCertificates(parsedCerts);
            alert(`Successfully fetched and parsed ${parsedCerts.length} certificates!`);
        } catch (error) {
            console.error('Error fetching Google Sheet:', error);
            alert('Failed to fetch/parse the Google Sheet. Please verify if the sheet is public and shared with "Anyone with the link can view".');
        } finally {
            setIsFetchingSheet(false);
        }
    };

    const downloadManualODLetter = async () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            // Load Logos
            const loadImg = (path) => new Promise(res => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = path;
            });

            const [rit, ts] = await Promise.all([loadImg(ritLogo), loadImg(techsparkLogo)]);

            // Header Section
            if (rit) doc.addImage(rit, 'PNG', 15, 10, 65, 15);
            if (ts) doc.addImage(ts, 'PNG', pageWidth - 55, 10, 40, 15);

            doc.setDrawColor(200);
            doc.line(15, 30, pageWidth - 15, 30);

            // Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('ON-DUTY REQUISITION LETTER', pageWidth / 2, 42, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.line(pageWidth / 2 - 40, 44, pageWidth / 2 + 40, 44);

            // Date
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, 52, { align: 'right' });

            // From & To
            doc.setFont('helvetica', 'bold');
            doc.text('FROM:', 15, 60);
            doc.setFont('helvetica', 'normal');
            const fromLines = doc.splitTextToSize(odLetterData.from, 80);
            doc.text(fromLines, 15, 65);

            const toY = 65 + (fromLines.length * 5) + 5;
            doc.setFont('helvetica', 'bold');
            doc.text('TO:', 15, toY);
            doc.setFont('helvetica', 'normal');
            const toLines = doc.splitTextToSize(odLetterData.to, 80);
            doc.text(toLines, 15, toY + 5);

            // Salutation
            const salutationY = toY + 5 + (toLines.length * 5) + 10;
            doc.setFont('helvetica', 'normal');
            doc.text(odLetterData.salutation, 15, salutationY);

            // Subject — wrap if long
            doc.setFont('helvetica', 'bold');
            const subjectText = 'SUB: ' + odLetterData.subject;
            const subjectLines = doc.splitTextToSize(subjectText, pageWidth - 30);
            doc.text(subjectLines, 15, salutationY + 8);

            // Body — left-aligned with correct safe width
            const bodyStartY = salutationY + 8 + (subjectLines.length * 6) + 6;
            doc.setFont('helvetica', 'normal');
            const safeWidth = pageWidth - 30; // 15mm margin on each side
            const bodyLines = doc.splitTextToSize(odLetterData.body, safeWidth);
            doc.text(bodyLines, 15, bodyStartY);

            // Students Table
            let tableY = bodyStartY + (bodyLines.length * 5) + 10;

            if (odLetterData.students.length > 0) {
                autoTable(doc, {
                    startY: tableY,
                    head: [['S.No', 'Name', 'Register No', 'Dept', 'Sec', 'Year']],
                    body: odLetterData.students.map((s, i) => [i + 1, s.name.toUpperCase(), s.rollNumber, s.dept, s.section || '-', s.year]),
                    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
                    styles: { fontSize: 9 },
                    margin: { left: 15, right: 15 }
                });
                tableY = doc.lastAutoTable.finalY + 15;
            } else {
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150);
                doc.text('(No students added to this requisition)', 15, tableY);
                doc.setTextColor(0);
                tableY += 15;
            }

            // Signatures
            const sigWidth = (pageWidth - 30) / odLetterData.signatures.length;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);

            // Check if room for signatures, if not add page
            if (tableY > pageHeight - 40) {
                doc.addPage();
                tableY = 40;
            }

            odLetterData.signatures.forEach((sig, i) => {
                const x = 15 + (i * sigWidth) + (sigWidth / 2);
                doc.line(15 + (i * sigWidth) + 5, tableY + 20, 15 + ((i + 1) * sigWidth) - 5, tableY + 20);
                doc.text(sig, x, tableY + 25, { align: 'center' });
            });

            doc.save(`OD_Requisition_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error("OD PDF Error:", error);
            alert("Failed to generate OD PDF.");
        }
    };

    const initDashboardSync = async (silent = false) => {
        if (!silent) setLoadingData(true);
        console.log("Initializing Strategic Data Engine (Optimized)...");

        try {
            // 1. Optimized Totals using getCountFromServer (Cost: 1 read per 1000 docs)
            const [studentsCount, eventsCount, regsCount, feedbackCount, organicCount] = await Promise.all([
                getCountFromServer(collection(db, 'users')),
                getCountFromServer(collection(db, 'events')),
                getCountFromServer(collection(db, 'registrations')),
                getCountFromServer(collection(db, 'feedback')),
                getCountFromServer(collection(db, 'organizers'))
            ]);

            setStats({
                totalMembers: studentsCount.data().count,
                activeEvents: eventsCount.data().count, // This is an approximation of all events
                totalXP: 0, // Calculated later if needed, or fetched differently
                totalBadges: 0
            });

            // 2. Fetch ALL Students (no orderBy - new query shape auto-fetches fresh, client-side sort)
            const studentsSnap = await getDocs(collection(db, 'users'));
            const now = new Date();
            const academicYearRef = (now.getMonth() + 1) < 6 ? now.getFullYear() - 1 : now.getFullYear();
            const allStudentsData = studentsSnap.docs.map(docSnap => {
                const data = docSnap.data();
                // Compute yearOfStudy dynamically from admissionYear if not stored or outdated
                let yearOfStudy = data.yearOfStudy;
                if (data.admissionYear) {
                    const calculated = academicYearRef - parseInt(data.admissionYear) + 1;
                    if (calculated > 0 && calculated <= 4) yearOfStudy = calculated;
                    else if (calculated > 4) yearOfStudy = 'Alumni';
                }
                return { id: docSnap.id, ...data, yearOfStudy };
            });
            allStudentsData.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
            setAllStudents(allStudentsData);

            // 3. Fetch ALL Events
            const eventsSnap = await getDocs(collection(db, 'events'));
            setEvents(eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 4. Fetch Recent Registrations (Last 200)
            const regsQuery = query(collection(db, 'registrations'), orderBy('registeredAt', 'desc'), limit(200));
            const regsSnap = await getDocs(regsQuery);
            setRegistrations(regsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 5. Fetch Recent Feedback
            const feedbackQuery = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'), limit(100));
            const feedbackSnap = await getDocs(feedbackQuery);
            setFeedbackBase(feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 6. Security & Submissions
            const securityQuery = query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(50));
            const securitySnap = await getDocs(securityQuery);
            setSecurityLogs(securitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const submissionsQuery = query(collection(db, 'quizSubmissions'), orderBy('timestamp', 'desc'), limit(100));
            const submissionsSnap = await getDocs(submissionsQuery);
            setSubmissions(submissionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 7. Fetch Organizers
            const organizersSnap = await getDocs(collection(db, 'organizers'));
            setOrganizers(organizersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 8. Fetch Coordinators (Core Team)
            const coordsSnap = await getDocs(collection(db, 'coordinators'));
            setCoordinators(coordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            console.log("Strategic Intel Synchronized.");
            setLoadingData(false);
        } catch (error) {
            console.error("Strategic Sync Error:", error);
            setLoadingData(false);
        }
    };

    // Manual refresh function for admin
    const refreshDashboardData = () => {
        initDashboardSync();
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

    // Live Event Edit Handlers
    const handleOpenEditLiveEvent = (event) => {
        if (event.status !== 'LIVE') {
            alert('⚠️ Only LIVE events can be edited!');
            return;
        }

        setEventToEdit(event);
        // Parse date string to extract time if it contains '|'
        const eventTime = event.date && event.date.includes('|')
            ? event.date.split('|')[1].trim()
            : (event.time || '');

        setLiveEventEditData({
            time: eventTime,
            venue: event.venue || '',
            maxTeamSize: event.maxTeamSize || ''
        });
        setIsEditLiveEventModalOpen(true);
    };

    const handleSaveLiveEventEdit = async () => {
        if (!eventToEdit) return;

        setIsSavingLiveEventEdit(true);
        try {
            const updateData = {};

            // Update time
            if (liveEventEditData.time.trim()) {
                // Update the date field to include new time
                const datePart = eventToEdit.date && eventToEdit.date.includes('|')
                    ? eventToEdit.date.split('|')[0].trim()
                    : eventToEdit.date;
                updateData.date = `${datePart} | ${liveEventEditData.time.trim()}`;
                updateData.time = liveEventEditData.time.trim();
            }

            // Update venue
            if (liveEventEditData.venue.trim()) {
                updateData.venue = liveEventEditData.venue.trim();
            }

            // Update team size (only if it's a team event)
            if (eventToEdit.isTeamEvent && liveEventEditData.maxTeamSize) {
                const teamSize = parseInt(liveEventEditData.maxTeamSize);
                if (teamSize > 0 && teamSize <= 10) {
                    updateData.maxTeamSize = teamSize;
                } else {
                    alert('⚠️ Team size must be between 1 and 10');
                    setIsSavingLiveEventEdit(false);
                    return;
                }
            }

            // Add edit metadata
            updateData.lastEditedAt = serverTimestamp();
            updateData.lastEditedBy = admin?.username || 'Admin';

            await updateDoc(doc(db, 'events', eventToEdit.id), updateData);

            alert(`✅ Event "${eventToEdit.title}" updated successfully!`);
            setIsEditLiveEventModalOpen(false);
            setEventToEdit(null);
        } catch (error) {
            console.error('Error updating live event:', error);
            alert('❌ Failed to update event details');
        } finally {
            setIsSavingLiveEventEdit(false);
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
                admissionYear: editingStudent.admissionYear || new Date().getFullYear().toString(),
                gender: editingStudent.gender || ''
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
                if (rit) doc.addImage(rit, 'PNG', 10, 8, 52, 12);
                if (ts) doc.addImage(ts, 'PNG', pageWidth - 55, 8, 41, 12);
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
                doc.text(`OFFICIAL EVENT REPORT | ID: ${reportId} | PAGE ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            };

            const drawSectionHeader = (title, pageNum) => {
                doc.setFillColor(241, 245, 249); // light blue-gray background
                doc.rect(15, 38, pageWidth - 30, 10, 'F');
                doc.setDrawColor(37, 99, 235); // Blue-600
                doc.setLineWidth(1);
                doc.line(15, 38, 15, 48); // Accent line

                doc.setFontSize(14);
                doc.setTextColor(30, 41, 59); // slate-800
                doc.setFont('helvetica', 'bold');
                doc.text(title, 20, 44.5);

                addPageFooter(pageNum);
            };

            await addLogos();
            drawBranding();

            // --- PAGE 1: ENHANCED COVER PAGE ---

            // Main Title
            doc.setTextColor(30, 41, 59); // Dark slate
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(40);
            doc.text('TECHSPARK CLUB', pageWidth / 2, 80, { align: 'center' });

            // Subtitle
            doc.setFontSize(24);
            doc.setTextColor(59, 130, 246); // Blue-500
            doc.text('EVENT FINAL REPORT', pageWidth / 2, 100, { align: 'center' });

            // Decorative line
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(1.5);
            doc.line(pageWidth / 2 - 60, 108, pageWidth / 2 + 60, 108);

            // Event Title
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            const eventTitle = event.title.toUpperCase();
            const titleLines = doc.splitTextToSize(eventTitle, pageWidth - 60);
            doc.text(titleLines, pageWidth / 2, 130, { align: 'center' });

            // Info Box
            const boxY = 155;
            doc.setFillColor(248, 250, 252); // Gray-50
            doc.setDrawColor(226, 232, 240); // Gray-200
            doc.setLineWidth(0.5);
            doc.roundedRect(30, boxY, pageWidth - 60, 45, 3, 3, 'FD');

            // Info Box Content
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105); // Gray-600

            const infoY = boxY + 12;
            doc.text(`Event Date: ${event.date}`, 40, infoY);
            doc.text(`Venue: ${event.venue || 'RIT Campus'}`, 40, infoY + 8);
            doc.text(`Total Registrations: ${eventRegs.length}`, 40, infoY + 16);
            doc.text(`Attendance Rate: ${attendanceRate}%`, 40, infoY + 24);

            doc.text(`Event Type: ${event.type || 'General'}`, pageWidth / 2 + 10, infoY);
            doc.text(`Avg Rating: ${avgRating}/5.0`, pageWidth / 2 + 10, infoY + 8);
            doc.text(`Report ID: ${reportId}`, pageWidth / 2 + 10, infoY + 16);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2 + 10, infoY + 24);

            // Confidential Notice
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(107, 114, 128); // Gray-500
            doc.text('CONFIDENTIAL - For Internal Use Only', pageWidth / 2, 220, { align: 'center' });

            // Authorization
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 99, 235);
            doc.text('Authorized by TechSpark Club Administration', pageWidth / 2, 240, { align: 'center' });

            addPageFooter(1);

            // --- PAGE 2: EXECUTIVE INTELLIGENCE SUMMARY ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('EXECUTIVE SUMMARY');

            drawSectionHeader('I. EXECUTIVE SUMMARY', 2);

            autoTable(doc, {
                startY: 55,
                body: [
                    ['EVENT STATUS', 'COMPLETED SUCCESSFULLY'],
                    ['TOTAL REGISTRATIONS', eventRegs.length.toString()],
                    ['ATTENDANCE COUNT', presentCount.toString()],
                    ['ATTENDANCE RATE', `${attendanceRate}%`],
                    ['DEPARTMENTS REPRESENTED', `${Object.keys(analysis.depts).length} Departments`],
                    ['TOP CONTRIBUTING DEPT', `${topDept?.[0] || 'N/A'} (${topDept?.[1] || 0} Students)`],
                    ['PRIMARY YEAR GROUP', `${topYear?.[0] || 'N/A'} Year (${topYear?.[1] || 0} Students)`],
                    ['BENCHMARK FEEDBACK', `${avgRating} / 5.0`]
                ],
                theme: 'striped',
                styles: { fontSize: 10, cellPadding: 8, textColor: [51, 65, 85] },
                headStyles: { fillColor: [30, 41, 59] },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 100, textColor: [30, 41, 59] }
                },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            // --- PAGE 3: PARTICIPANT MANIFEST ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('REGISTRATION LOG');

            drawSectionHeader('II. REGISTRATION MANIFEST', 3);

            const regTableData = eventRegs.map((r, i) => [
                i + 1,
                (r.studentName || 'N/A').toUpperCase(),
                r.studentRoll,
                r.studentDept,
                r.registeredAt?.toDate ? new Date(r.registeredAt.toDate()).toLocaleDateString() : 'N/A'
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['#', 'STUDENT NAME', 'ROLL NUMBER', 'DEPARTMENT', 'REGISTRATION DATE']],
                body: regTableData,
                headStyles: { fillColor: [30, 41, 59], fontSize: 8, halign: 'center' },
                styles: { fontSize: 7, textColor: [71, 85, 105] },
                columnStyles: {
                    0: { halign: 'center' },
                    2: { halign: 'center' },
                    4: { halign: 'center' }
                }
            });

            // --- PAGE 4: ATTENDANCE AUDIT ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('ATTENDANCE AUDIT');

            drawSectionHeader('III. ATTENDANCE AUDIT', 4);

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
                head: [['#', 'STUDENT NAME', 'ROLL NUMBER', 'DEPARTMENT', 'STATUS']],
                body: attendedList,
                headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
                styles: { fontSize: 7, textColor: [30, 41, 59] }
            });

            if (absentList.length > 0) {
                let currentY = doc.lastAutoTable.finalY + 15;
                if (currentY > 230) {
                    doc.addPage();
                    drawBranding();
                    await addLogos();
                    drawSectionHeader('III. ATTENDANCE AUDIT (CONTINUED)', 4);
                    currentY = 55;
                }

                doc.setFontSize(11);
                doc.setTextColor(220, 38, 38);
                doc.setFont('helvetica', 'bold');
                doc.text('NON-ATTENDANCE LIST:', 15, currentY);

                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['#', 'STUDENT NAME', 'ROLL NO', 'DEPT', 'STATUS']],
                    body: absentList,
                    headStyles: { fillColor: [220, 38, 38] }, // Red-600
                    styles: { fontSize: 7, textColor: [30, 41, 59] }
                });
            }

            // --- PAGE 5: FEEDBACK INTELLIGENCE ---
            doc.addPage();
            drawBranding();
            await addLogos();
            addWatermark('FEEDBACK INSIGHTS');

            drawSectionHeader('IV. FEEDBACK INTELLIGENCE', 5);

            const recommendationRate = ((eventFeedback.filter(f => f.rating >= 4).length / (eventFeedback.length || 1)) * 100).toFixed(1);

            autoTable(doc, {
                startY: 55,
                head: [['SATISFACTION METRIC', 'VALUE', 'RATING']],
                body: [
                    ['OVERALL SATISFACTION SCORE', `${avgRating} / 5.0`, '★'.repeat(Math.round(avgRating))],
                    ['PARTICIPANT APPROVAL RATE', `${recommendationRate}%`, 'HIGH VALIDITY'],
                    ['TOTAL VERIFIED RESPONSES', eventFeedback.length.toString(), 'SYSTEM LOGGED']
                ],
                headStyles: { fillColor: [124, 58, 237] }, // Violet-600
                styles: { fontSize: 9, textColor: [30, 41, 59] }
            });

            let feedbackY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(11);
            doc.setTextColor(37, 99, 235);
            doc.setFont('helvetica', 'bold');
            doc.text('QUALITATIVE FEEDBACK HIGHLIGHTS', 15, feedbackY);

            feedbackY += 10;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 116, 139); // slate-500

            const highlights = eventFeedback.filter(f => f.rating >= 4).slice(0, 5);
            if (highlights.length > 0) {
                highlights.forEach(f => {
                    const comment = f.comment || f.feedback || 'Incredible experience!';
                    const textLines = doc.splitTextToSize(`" ${comment} "`, pageWidth - 40);
                    doc.text(textLines, 15, feedbackY);
                    feedbackY += (textLines.length * 5) + 3;
                });
            } else {
                doc.text('No qualitative highlights available for this reporting period.', 15, feedbackY);
            }

            // --- HACKATHON JUDGE SCORES (Only for Hackathon events) ---
            if (event.type === 'Hackathon' || event.isTeamEvent) {
                try {
                    // Fetch hackathon scores
                    const scoresQuery = query(
                        collection(db, 'hackathonScores'),
                        where('eventId', '==', event.id)
                    );
                    const scoresSnap = await getDocs(scoresQuery);
                    const scores = scoresSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                    if (scores.length > 0) {
                        // Group by team and calculate averages
                        const teamScores = new Map();
                        scores.forEach(score => {
                            if (!teamScores.has(score.teamCode)) {
                                teamScores.set(score.teamCode, {
                                    teamCode: score.teamCode,
                                    teamName: score.teamName || score.teamCode,
                                    problemStatement: score.problemStatement || 'N/A',
                                    scores: [],
                                    totalScore: 0,
                                    averageScore: 0
                                });
                            }
                            teamScores.get(score.teamCode).scores.push({
                                judgeName: score.judgeName || 'Anonymous Judge',
                                totalScore: score.totalScore || 0,
                                criteria: score.criteria || {}
                            });
                        });

                        // Calculate averages and sort
                        const rankedTeams = Array.from(teamScores.values())
                            .map(team => {
                                const total = team.scores.reduce((sum, s) => sum + s.totalScore, 0);
                                team.totalScore = total;
                                team.averageScore = total / team.scores.length;
                                return team;
                            })
                            .sort((a, b) => b.averageScore - a.averageScore);

                        // Add Judge Scores Page
                        doc.addPage();
                        drawBranding();
                        await addLogos();
                        addWatermark('JUDGING RESULTS');

                        drawSectionHeader('V. COMPETITIVE EVALUATION', 6);

                        // Winners Podium
                        let currentY = 60;
                        const medals = ['[GOLD]', '[SILVER]', '[BRONZE]'];
                        const colors = [[255, 215, 0], [192, 192, 192], [205, 127, 50]];

                        rankedTeams.slice(0, 3).forEach((team, idx) => {
                            doc.setFillColor(...colors[idx]);
                            doc.roundedRect(20, currentY, pageWidth - 40, 25, 2, 2, 'F');

                            doc.setFontSize(11);
                            doc.setTextColor(0);
                            doc.setFont('helvetica', 'bold');
                            doc.text(`${medals[idx]} ${idx + 1}${idx === 0 ? 'ST' : idx === 1 ? 'ND' : 'RD'} PLACE`, 25, currentY + 8);
                            doc.setFontSize(9);
                            doc.text(`Team: ${team.teamName}`, 25, currentY + 15);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'normal');
                            doc.text(`Average Score: ${team.averageScore.toFixed(2)} | Judges: ${team.scores.length}`, 25, currentY + 21);

                            currentY += 30;
                        });

                        // Detailed Scoring Table
                        currentY += 10;
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(15, 23, 42);
                        doc.text('Detailed Judge Evaluations', 20, currentY);

                        const judgeTableData = [];
                        rankedTeams.forEach((team, idx) => {
                            // Text-based rating
                            let rating = 'FAIR';
                            if (team.averageScore >= 45) rating = 'EXCELLENT';
                            else if (team.averageScore >= 40) rating = 'VERY GOOD';
                            else if (team.averageScore >= 35) rating = 'GOOD';

                            judgeTableData.push([
                                `${idx + 1}`,
                                team.teamName,
                                team.averageScore.toFixed(2),
                                team.scores.length,
                                rating
                            ]);
                        });

                        autoTable(doc, {
                            startY: currentY + 5,
                            head: [['Rank', 'Team Name', 'Avg Score', 'Judges', 'Rating']],
                            body: judgeTableData,
                            headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
                            styles: { fontSize: 8 },
                            columnStyles: {
                                0: { cellWidth: 15 },
                                1: { cellWidth: 70 },
                                2: { cellWidth: 30 },
                                3: { cellWidth: 20 },
                                4: { cellWidth: 30 }
                            }
                        });

                        // Individual Judge Scores (for top 3)
                        currentY = doc.lastAutoTable.finalY + 15;
                        if (currentY > 240) {
                            doc.addPage();
                            drawBranding();
                            await addLogos();
                            currentY = 50;
                        }

                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Individual Judge Scores (Top 3 Teams)', 20, currentY);
                        currentY += 10;
                        rankedTeams.slice(0, 3).forEach((team, teamIdx) => {
                            if (currentY > 250) {
                                doc.addPage();
                                drawBranding();
                                addLogos();
                                currentY = 50;
                            }

                            doc.setFontSize(10);
                            doc.setFont('helvetica', 'bold');
                            doc.setTextColor(37, 99, 235);
                            doc.text(`${medals[teamIdx]} ${team.teamName}`, 20, currentY);
                            currentY += 5;

                            const judgeData = team.scores.map(s => [
                                s.judgeName,
                                s.totalScore.toFixed(1)
                            ]);

                            autoTable(doc, {
                                startY: currentY,
                                head: [['Judge Name', 'Score']],
                                body: judgeData,
                                headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
                                styles: { fontSize: 7 },
                                margin: { left: 25 }
                            });

                            currentY = doc.lastAutoTable.finalY + 10;
                        });

                        addPageFooter(6);
                    }
                } catch (err) {
                    console.log('No hackathon scores found:', err);
                }
            }

            // --- LAST PAGE: OFFICIAL ATTESTATION ---
            doc.addPage();
            drawBranding();
            await addLogos();

            drawSectionHeader('VI. OFFICIAL ATTESTATION', 7);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            const declarationText = 'This comprehensive Event Report constitutes the official administrative record of the activity organized under the auspices of TechSpark Club, RIT Chennai. All data pertaining to registration, attendance, and feedback has been programmatically captured and verified via QR-based telemetry. This document is intended for institutional archiving, audit compliance, and organizational performance assessment.';

            const declarationLines = doc.splitTextToSize(declarationText, pageWidth - 40);
            doc.text(declarationLines, 20, 60);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(20, 95, pageWidth - 40, 12, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('ADMINISTRATIVE STATUS: FINALIZED & VERIFIED', pageWidth / 2, 103, { align: 'center' });

            // Signature Blocks
            const sigY = 145;
            const sigWidth = 50;
            const sigGap = (pageWidth - 40 - (sigWidth * 3)) / 2;

            const drawSig = (x, label) => {
                doc.setDrawColor(203, 213, 225); // slate-300
                doc.line(x, sigY, x + sigWidth, sigY);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(100, 116, 139);
                doc.text(label.toUpperCase(), x + (sigWidth / 2), sigY + 6, { align: 'center' });
            };

            drawSig(20, 'Club Coordinator');
            drawSig(20 + sigWidth + sigGap, 'Faculty Coordinator');
            drawSig(pageWidth - 20 - sigWidth, 'Principal / HoD');

            doc.setFontSize(11);
            doc.setTextColor(37, 99, 235);
            doc.text('TECHSPARK CLUB ADMINISTRATION', pageWidth / 2, 260, { align: 'center' });
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY, CHENNAI', pageWidth / 2, 268, { align: 'center' });

            // FINAL SAVE
            doc.save(`${event.title.replace(/\s+/g, '_')}_Final_Report.pdf`);
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
            if (rit) doc.addImage(rit, 'PNG', 12, 10, 65, 15);
            if (ts) doc.addImage(ts, 'PNG', pageWidth - 66, 10, 51, 15);
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

    const renderContentWrapper = () => {
        try {
            return renderContent();
        } catch (error) {
            return <div className="text-red-500 p-10 bg-white m-10 rounded-xl overflow-auto text-left shadow-2xl relative z-[9999]">
                <h1 className="text-2xl font-bold">Dashboard Crash</h1>
                <p className="font-bold my-4">{error.message}</p>
                <pre className="text-xs bg-red-50 p-4 rounded-xl">{error.stack}</pre>
            </div>;
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
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
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
                                    className={`relative overflow-hidden bg-white p-4 lg:p-5 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/50 group cursor-pointer flex flex-col justify-between min-h-[130px] lg:min-h-[150px]`}
                                >
                                    {/* Glow Effect */}
                                    <div className={`absolute -top-12 -right-12 w-32 h-32 ${stat.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500`} />

                                    {/* Top Row: Icon and Badge */}
                                    <div className="flex justify-between items-start w-full mb-3">
                                        <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${stat.gradient} text-white shadow-md relative shrink-0`}>
                                            <div className="scale-90">
                                                {stat.icon}
                                            </div>
                                            {stat.live && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-ping" />
                                            )}
                                            {stat.pulse && stat.value > 0 && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white animate-bounce" />
                                            )}
                                        </div>
                                        {stat.changeUp !== null && (
                                            <span className={`text-[9px] lg:text-[10px] font-bold px-2 py-1 rounded-md shrink-0 whitespace-nowrap ${stat.changeUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {stat.changeUp ? '↑' : '↓'} {stat.change}
                                            </span>
                                        )}
                                    </div>

                                    {/* Bottom Row: Value and Label */}
                                    <div className="mt-auto">
                                        <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                                            {stat.value.toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-tight break-words">
                                            {stat.label}
                                        </div>
                                    </div>

                                    {/* Sparkline Visual */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 opacity-50">
                                        <div className={`h-full bg-gradient-to-r ${stat.gradient} rounded-b-3xl`} style={{ width: `${Math.min(100, (stat.value / (stats.totalMembers || 1)) * 100)}%` }} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Analytics Grid */}
                        <div className="flex flex-col gap-8">
                            {/* Department Distribution - Premium Card */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/30 relative overflow-hidden w-full"
                            >
                                {/* Decorative Element */}
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-full blur-2xl" />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Department Intel</h3>
                                            <p className="text-xs text-slate-400 font-medium">Student distribution analysis</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <select 
                                            value={deptFilterBatch} 
                                            onChange={(e) => setDeptFilterBatch(e.target.value)}
                                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                        >
                                            <option value="ALL">All Batches</option>
                                            {Object.keys(analytics.batchWise || {}).sort().map(batch => (
                                                <option key={batch} value={batch}>Batch {batch}</option>
                                            ))}
                                        </select>
                                        
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                                {
                                                    (() => {
                                                        const filtered = deptFilterBatch === 'ALL' ? allStudents : allStudents.filter(s => getStudentExtendedData(s).batch === deptFilterBatch);
                                                        return filtered.length;
                                                    })()
                                                } Students
                                            </span>
                                            <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                                {
                                                    (() => {
                                                        const filtered = deptFilterBatch === 'ALL' ? allStudents : allStudents.filter(s => getStudentExtendedData(s).batch === deptFilterBatch);
                                                        const map = {};
                                                        filtered.forEach(s => map[getStudentExtendedData(s).dept] = true);
                                                        return Object.keys(map).length;
                                                    })()
                                                } Depts
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative h-64 w-full mt-2 flex">
                                    {(() => {
                                        const filteredDeptStudents = deptFilterBatch === 'ALL' 
                                            ? allStudents 
                                            : allStudents.filter(s => getStudentExtendedData(s).batch === deptFilterBatch);
                                        
                                        const localDeptMap = {};
                                        filteredDeptStudents.forEach(s => {
                                            const { dept } = getStudentExtendedData(s);
                                            localDeptMap[dept] = (localDeptMap[dept] || 0) + 1;
                                        });
                                        
                                        const maxCount = Math.max(...Object.values(localDeptMap), 1);
                                        const sortedDepts = Object.entries(localDeptMap).sort((a, b) => b[1] - a[1]);

                                        return (
                                            <>
                                                {/* Y-Axis Grid */}
                                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pt-10 pb-6">
                                                    {[4, 3, 2, 1, 0].map(i => (
                                                        <div key={i} className="flex items-center w-full h-0">
                                                            <span className="w-8 text-[9px] text-slate-400 font-bold text-right pr-2 shrink-0">
                                                                {Math.round((maxCount / 4) * i)}
                                                            </span>
                                                            <div className="flex-1 border-t border-slate-100" />
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* X-Axis and Bars */}
                                                <div className="relative z-10 flex-1 flex justify-around items-end h-full pl-8 pt-10 pb-6 overflow-x-auto custom-scrollbar">
                                                    {sortedDepts.map(([dept, count], idx) => {
                                                        const heightPct = (count / maxCount) * 100;
                                                        
                                                        return (
                                                            <div key={dept} className="flex flex-col items-center justify-end h-full group relative min-w-[32px] px-1">
                                                                {/* Tooltip */}
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-800 text-white text-[9px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-20 shadow-lg">
                                                                    {count} Students
                                                                </div>
                                                                
                                                                {/* Gradient Bar */}
                                                                <motion.div 
                                                                    initial={{ height: 0 }}
                                                                    animate={{ height: `${heightPct}%` }}
                                                                    transition={{ duration: 1, delay: 0.1 * idx, ease: "easeOut" }}
                                                                    className="w-full max-w-[20px] sm:max-w-[28px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md relative cursor-pointer hover:brightness-110 transition-all overflow-hidden shadow-sm"
                                                                />
                                                                
                                                                {/* X-Axis Label */}
                                                                <span className="absolute bottom-0 translate-y-5 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                                                    {dept}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </motion.div>

                            {/* Year-wise Distribution - Premium Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/30 relative overflow-hidden"
                            >
                                {/* Decorative Element */}
                                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-2xl" />

                                <div className="flex items-center justify-between mb-6 relative">
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

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                                    {Object.entries(analytics.yearWise).map(([year, count], idx) => (
                                        <motion.div
                                            key={year}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.5 + idx * 0.1 }}
                                            whileHover={{ scale: 1.03 }}
                                            className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 text-center group cursor-pointer relative overflow-hidden flex flex-col justify-center"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-indigo-500/3 group-hover:to-purple-500/5 transition-all duration-500" />
                                            <div className="text-2xl font-black text-indigo-600 relative">{count}</div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 relative">{year} Year</div>
                                            <div className="text-[8px] text-slate-400 font-bold mt-1 relative">{((count / stats.totalMembers) * 100).toFixed(1)}% of total</div>
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
                                                        {event.status === 'LIVE' && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => { e.stopPropagation(); handleOpenEditLiveEvent(event); }}
                                                                className="p-2.5 bg-gradient-to-br from-purple-50 to-pink-50 text-purple-600 rounded-xl hover:from-purple-500 hover:to-pink-600 hover:text-white transition-all duration-300 shadow-lg shadow-transparent hover:shadow-purple-500/30"
                                                                title="Edit Event Details"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </motion.button>
                                                        )}
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
                                    {stats.totalMembers} Verified Members
                                </span>
                            </div>
                        </div>


                        {/* Analytic Cards Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {[
                                { label: 'Top Department', value: Object.entries(analytics.deptWise).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A', icon: <Briefcase /> },
                                { label: 'Peak Year', value: (Object.entries(analytics.yearWise).sort((a, b) => b[1] - a[1])[0]?.[0] ? `${Object.entries(analytics.yearWise).sort((a, b) => b[1] - a[1])[0]?.[0]} Year` : 'N/A'), icon: <TrendingUp /> },
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

                        {/* Gender Intelligence Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                                <div className="shrink-0 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600">
                                        <PieChart className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Gender Balance</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Personnel Distribution Map</p>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-wrap items-center gap-6">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <div key={g} className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 min-w-[140px]">
                                            <div className={`w-3 h-3 rounded-full ${g === 'Male' ? 'bg-blue-500' : g === 'Female' ? 'bg-pink-500' : 'bg-purple-500'}`} />
                                            <div>
                                                <div className="text-lg font-black text-slate-800 tabular-nums">{analytics.genderWise[g] || 0}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{g}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:col-span-1 bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-[2.5rem] shadow-xl shadow-orange-500/10 text-white relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldAlert className="w-5 h-5 text-orange-200" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100">Pending Action</span>
                                    </div>
                                    <div className="text-4xl font-black mb-1 tabular-nums">{analytics.pendingGenderUpdates}</div>
                                    <p className="text-[10px] font-black text-orange-500 bg-white/90 px-3 py-1.5 rounded-xl inline-block uppercase tracking-widest">
                                        Missing Gender Info
                                    </p>
                                </div>
                                <div className="absolute -bottom-4 -right-4 text-white/10 group-hover:scale-110 transition-transform">
                                    <Activity className="w-32 h-32" />
                                </div>
                            </div>
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
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Live Directory of {stats.totalMembers} Verified Users</p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-80">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Filter by Name, Roll Number, or Dept..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
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
                                            <th className="px-5 py-4">Verified Member</th>
                                            <th className="px-5 py-4">Register ID</th>
                                            <th className="px-5 py-4">Sub-Division</th>
                                            <th className="px-5 py-4 text-center whitespace-nowrap">Spark XP</th>
                                            <th className="px-5 py-4 text-right whitespace-nowrap">Management</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredStudents.map((student) => (
                                            <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white border border-slate-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm uppercase shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                                                            {student.fullName?.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0 flex-1 max-w-[150px] md:max-w-[200px] xl:max-w-[300px]">
                                                            <p className="text-[14px] font-bold text-slate-800 tracking-tight truncate">{student.fullName}</p>
                                                            <p className="text-[12px] text-slate-500 font-medium lowercase mt-0.5 truncate" title={student.email}>{student.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 font-mono font-semibold text-slate-600 text-[13px]">{student.rollNumber}</td>
                                                <td className="px-5 py-4">
                                                    <div className="space-y-1">
                                                        {(() => {
                                                            const { year, batch, dept } = getStudentExtendedData(student);
                                                            return (
                                                                <>
                                                                    <p className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">{dept}</p>
                                                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                                        {year} Year • Batch {batch} • Sec {student.section || 'N/A'}
                                                                    </p>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[11px] font-bold uppercase tracking-wider border border-emerald-100">
                                                        {student.points || 0} XP
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => handleEditStudent(student)}
                                                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Edit Profile"
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleManageStudent(student)}
                                                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                            title="Mission Intelligence"
                                                        >
                                                            <UserCog className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStudent(student.id)}
                                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
                                                    
                                                    const targetStatus = event.status === 'PENDING' ? 'REJECTED' : 'LIVE';
                                                    
                                                    // Optimistic UI state transition
                                                    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: targetStatus } : e));
                                                    
                                                    try {
                                                        await updateDoc(doc(db, 'events', event.id), {
                                                            status: targetStatus,
                                                            remarks,
                                                            lastActionBy: admin.username,
                                                            lastActionAt: serverTimestamp()
                                                        });
                                                        fetchDashboardData(true); // silent refresh
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Database update failed. Reverting state...");
                                                        fetchDashboardData(); // fallback full sync
                                                    }
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
            case 'reports':
                return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="mb-6">
                            <h3 className="text-3xl font-black text-slate-800 italic uppercase">Club Reports <span className="text-blue-600">&</span> Requisitions</h3>
                            <p className="text-slate-500 font-medium">Generate high-fidelity intelligence, requisitions, and reports</p>
                        </div>

                        {/* Submenu Tabs */}
                        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-8">
                            {[
                                { id: 'strategic_reports', label: 'Strategic Reports' },
                                { id: 'od_generator', label: 'OD Requisition' },
                                { id: 'event_report_generator', label: 'Event Report Generator' },
                                { id: 'approval_letter_generator', label: 'Approval Letter Generator' },
                                { id: 'annual_report_generator', label: 'Annual Report Generator' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setReportsSubTab(tab.id)}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                                        reportsSubTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {reportsSubTab === 'strategic_reports' && (
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
                        )}

                        {reportsSubTab === 'od_generator' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xl font-black text-slate-800 uppercase italic">OD <span className="text-blue-600">Requisition</span></h4>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Create official requisition letters for club members</p>
                                    </div>
                                    <button
                                        onClick={downloadManualODLetter}
                                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-3"
                                    >
                                        <Download className="w-4 h-4" /> Download Official PDF
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left: Input Form */}
                                    <div className="space-y-6">
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                                                    <textarea
                                                        rows="4"
                                                        value={odLetterData.from}
                                                        onChange={(e) => setOdLetterData({ ...odLetterData, from: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold uppercase outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                        placeholder="Sender Details..."
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                                                    <textarea
                                                        rows="4"
                                                        value={odLetterData.to}
                                                        onChange={(e) => setOdLetterData({ ...odLetterData, to: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold uppercase outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                        placeholder="Recipient Details..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Salutation</label>
                                                    <input
                                                        type="text"
                                                        value={odLetterData.salutation}
                                                        onChange={(e) => setOdLetterData({ ...odLetterData, salutation: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                        placeholder="Respected Mam/Sir,"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                                                    <input
                                                        type="text"
                                                        value={odLetterData.subject}
                                                        onChange={(e) => setOdLetterData({ ...odLetterData, subject: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                        placeholder="Requisition for..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contents / Body</label>
                                                <textarea
                                                    rows="5"
                                                    value={odLetterData.body}
                                                    onChange={(e) => setOdLetterData({ ...odLetterData, body: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                    placeholder="Write the letter body here..."
                                                />
                                            </div>

                                            <div className="pt-6 border-t border-slate-100">
                                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">Authorized Signatures</h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {odLetterData.signatures.map((sig, idx) => (
                                                        <div key={idx} className="relative group">
                                                            <input
                                                                type="text"
                                                                value={sig}
                                                                onChange={(e) => {
                                                                    const newSigs = [...odLetterData.signatures];
                                                                    newSigs[idx] = e.target.value;
                                                                    setOdLetterData({ ...odLetterData, signatures: newSigs });
                                                                }}
                                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Student Management */}
                                    <div className="space-y-6">
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <Users className="w-4 h-4 text-blue-600" /> Member Selection
                                            </h4>

                                            <div className="flex gap-2 mb-8">
                                                <input
                                                    type="text"
                                                    value={odInputRoll}
                                                    onChange={(e) => setOdInputRoll(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddOdStudent()}
                                                    placeholder="Enter Register Number..."
                                                    className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                />
                                                <button
                                                    onClick={handleAddOdStudent}
                                                    disabled={isSearchingOdStudent}
                                                    className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                                                >
                                                    {isSearchingOdStudent ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Add Member'}
                                                </button>
                                            </div>

                                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                                {odLetterData.students.length > 0 ? odLetterData.students.map((student, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">
                                                                {student.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-slate-800 uppercase">{student.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400">{student.rollNumber} • {student.dept} • Sec {student.section || '-'} • {student.year} Year</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveOdStudent(student.rollNumber)}
                                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )) : (
                                                    <div className="py-20 text-center">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                                                            <Users className="w-8 h-8 text-slate-200" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No members added to requisition</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-blue-600 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20">
                                            <div className="flex items-start gap-4">
                                                <Info className="w-6 h-6 shrink-0 mt-1" />
                                                <div>
                                                    <h5 className="font-black uppercase tracking-tight">Pro-Tip: Selective OD</h5>
                                                    <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                                                        Letters generated here follow the official TechSpark and RIT branding protocols. Ensure all register numbers are verified before export.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {reportsSubTab === 'event_report_generator' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div>
                                    <h4 className="text-xl font-black text-slate-800 uppercase italic">Event Report <span className="text-blue-600">Generator</span></h4>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Compile official, academic-grade post-event portfolios with telemetry metrics, certificates, and feedback</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: Event details, Guest details, dynamic subheadings */}
                                    <div className="space-y-6">
                                        {/* Main Event Selection */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">1. Target Event & Assets</h5>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Event</label>
                                                <select
                                                    value={selectedEventId}
                                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none cursor-pointer"
                                                >
                                                    <option value="">-- Select Event --</option>
                                                    {events.map((e) => (
                                                        <option key={e.id} value={e.id}>
                                                            {(e.title || e.eventName || '').toUpperCase()} ({e.date || 'No Date'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Poster</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handlePosterUpload}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                    />
                                                    {eventPoster && <p className="text-[9px] text-green-600 font-bold ml-1">✓ Poster loaded</p>}
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Approval Letter</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleApprovalLetterUpload}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                    />
                                                    {approvalLetter && <p className="text-[9px] text-green-600 font-bold ml-1">✓ Approval letter loaded</p>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Invited Guest Details */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">2. Invited Guest Speaker Details</h5>
                                            
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Guest Name</label>
                                                    <input
                                                        type="text"
                                                        value={eventGuestName}
                                                        onChange={(e) => setEventGuestName(e.target.value)}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                                                        placeholder="e.g. Dr. Jane Smith"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                                                        <input
                                                            type="text"
                                                            value={eventGuestDesig}
                                                            onChange={(e) => setEventGuestDesig(e.target.value)}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                                                            placeholder="e.g. Senior Principal Scientist"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization</label>
                                                        <input
                                                            type="text"
                                                            value={eventGuestOrg}
                                                            onChange={(e) => setEventGuestOrg(e.target.value)}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                                                            placeholder="e.g. CSRI Labs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dynamic Subheadings / Write-Up Sections */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">3. Report Write-up Sections</h5>
                                            
                                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                                {eventWriteupSections.map((sect, idx) => (
                                                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 relative">
                                                        <button
                                                            onClick={() => setEventWriteupSections(eventWriteupSections.filter((_, i) => i !== idx))}
                                                            className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={sect.title}
                                                            onChange={(e) => {
                                                                const updated = [...eventWriteupSections];
                                                                updated[idx].title = e.target.value;
                                                                setEventWriteupSections(updated);
                                                            }}
                                                            className="w-3/4 bg-transparent text-[11px] font-black uppercase outline-none border-b border-transparent focus:border-slate-200"
                                                            placeholder="Section Title"
                                                        />
                                                        <textarea
                                                            rows="3"
                                                            value={sect.content}
                                                            onChange={(e) => {
                                                                const updated = [...eventWriteupSections];
                                                                updated[idx].content = e.target.value;
                                                                setEventWriteupSections(updated);
                                                            }}
                                                            className="w-full px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-medium leading-relaxed outline-none"
                                                            placeholder="Section content..."
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Section form */}
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-2">
                                                <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Add New Section / Subheading</h6>
                                                <input
                                                    type="text"
                                                    value={newSectionTitle}
                                                    onChange={(e) => setNewSectionTitle(e.target.value)}
                                                    placeholder="Subheading (e.g. Technical Session Summary)"
                                                    className="w-full px-3 py-2 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"
                                                />
                                                <textarea
                                                    rows="2"
                                                    value={newSectionContent}
                                                    onChange={(e) => setNewSectionContent(e.target.value)}
                                                    placeholder="Section writeup..."
                                                    className="w-full px-3 py-2 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newSectionTitle) {
                                                            setEventWriteupSections([...eventWriteupSections, { title: newSectionTitle, content: newSectionContent }]);
                                                            setNewSectionTitle('');
                                                            setNewSectionContent('');
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                                                >
                                                    + Add Report Section
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Google Sheets Importer, Certificates Registry, Photographs & Export */}
                                    <div className="space-y-6">
                                        {/* Google Sheets Certificates Importer */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">4. Certificates Importer (Google Sheets)</h5>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Public Google Sheet Link (Shared / Anyone View)</label>
                                                <input
                                                    type="text"
                                                    value={sheetUrl}
                                                    onChange={(e) => setSheetUrl(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                                                    placeholder="Paste spreadsheet link..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Starting Row</label>
                                                    <input
                                                        type="number"
                                                        value={sheetStartRow}
                                                        onChange={(e) => setSheetStartRow(parseInt(e.target.value) || 2)}
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ending Row</label>
                                                    <input
                                                        type="number"
                                                        value={sheetEndRow}
                                                        onChange={(e) => setSheetEndRow(parseInt(e.target.value) || 10)}
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={fetchCertificateData}
                                                disabled={isFetchingSheet}
                                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                            >
                                                {isFetchingSheet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '+ Fetch Certificate Registry Data'}
                                            </button>

                                            {/* Loaded Certificates Registry */}
                                            {sheetCertificates.length > 0 && (
                                                <div className="space-y-3 pt-3 border-t border-slate-100">
                                                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fetched Certificate Roster ({sheetCertificates.length})</h6>
                                                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                                        {sheetCertificates.map((c, idx) => (
                                                            <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl text-[10px]">
                                                                <span className="font-bold text-slate-400">{idx + 1}.</span>
                                                                <input
                                                                    type="text"
                                                                    value={c.rollNumber}
                                                                    onChange={(e) => {
                                                                        const updated = [...sheetCertificates];
                                                                        updated[idx].rollNumber = e.target.value;
                                                                        setSheetCertificates(updated);
                                                                    }}
                                                                    className="w-1/4 bg-transparent outline-none font-bold uppercase"
                                                                    placeholder="Roll"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={c.name}
                                                                    onChange={(e) => {
                                                                        const updated = [...sheetCertificates];
                                                                        updated[idx].name = e.target.value;
                                                                        setSheetCertificates(updated);
                                                                    }}
                                                                    className="w-1/3 bg-transparent outline-none font-medium"
                                                                    placeholder="Name"
                                                                />
                                                                <select
                                                                    value={c.role}
                                                                    onChange={(e) => {
                                                                        const updated = [...sheetCertificates];
                                                                        updated[idx].role = e.target.value;
                                                                        setSheetCertificates(updated);
                                                                    }}
                                                                    className="bg-transparent outline-none font-black text-[9px] uppercase cursor-pointer"
                                                                >
                                                                    <option value="Participant">Participant</option>
                                                                    <option value="Winner">Winner</option>
                                                                </select>
                                                                <input
                                                                    type="text"
                                                                    value={c.certId}
                                                                    onChange={(e) => {
                                                                        const updated = [...sheetCertificates];
                                                                        updated[idx].certId = e.target.value;
                                                                        setSheetCertificates(updated);
                                                                    }}
                                                                    className="flex-1 bg-transparent outline-none text-slate-600 font-bold"
                                                                    placeholder="Cert ID"
                                                                />
                                                                <button
                                                                    onClick={() => setSheetCertificates(sheetCertificates.filter((_, i) => i !== idx))}
                                                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Gallery Photos */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">5. Event Gallery (Max 4)</h5>
                                                {eventImages.length > 0 && (
                                                    <button
                                                        onClick={() => setEventImages([])}
                                                        className="text-[9px] font-black text-red-500 hover:underline uppercase tracking-widest"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleGalleryImagesUpload}
                                                disabled={eventImages.length >= 4}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                            />
                                            {eventImages.length > 0 && (
                                                <div className="grid grid-cols-2 gap-3 mt-3">
                                                    {eventImages.map((img, idx) => (
                                                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200">
                                                            <img src={img} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Compile Action */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <button
                                                onClick={downloadEventReportPDF}
                                                disabled={isGeneratingReport || !selectedEventId}
                                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/10"
                                            >
                                                {isGeneratingReport ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" /> Compiling PDF...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4" /> Generate Event Report PDF
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {reportsSubTab === 'annual_report_generator' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div>
                                    <h4 className="text-xl font-black text-slate-800 uppercase italic">Annual Report <span className="text-blue-600">Generator</span></h4>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Pre-populated and fully editable summary of academic year metrics, events, and leadership</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: Cover Page, Leadership & Objectives */}
                                    <div className="space-y-6">
                                        {/* Cover Page */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">1. Cover Page Details</h5>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year</label>
                                                <input
                                                    type="text"
                                                    value={annualAcademicYear}
                                                    onChange={(e) => setAnnualAcademicYear(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none"
                                                    placeholder="e.g. 2025 - 2026"
                                                />
                                            </div>
                                        </div>

                                        {/* Leadership */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">2. Executive Leadership Committee</h5>
                                            
                                            {/* Faculty Coord */}
                                            <div className="space-y-3">
                                                <h6 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Faculty Coordinator</h6>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <input
                                                        type="text"
                                                        value={annualFacultyCoord.name}
                                                        onChange={(e) => setAnnualFacultyCoord({ ...annualFacultyCoord, name: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Name"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={annualFacultyCoord.designation}
                                                        onChange={(e) => setAnnualFacultyCoord({ ...annualFacultyCoord, designation: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Designation"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={annualFacultyCoord.department}
                                                        onChange={(e) => setAnnualFacultyCoord({ ...annualFacultyCoord, department: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Department"
                                                    />
                                                </div>
                                            </div>

                                            {/* President */}
                                            <div className="space-y-3 pt-3 border-t border-slate-100">
                                                <h6 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Club President</h6>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <input
                                                        type="text"
                                                        value={annualPresident.name}
                                                        onChange={(e) => setAnnualPresident({ ...annualPresident, name: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Name"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={annualPresident.designation}
                                                        onChange={(e) => setAnnualPresident({ ...annualPresident, designation: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Designation"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={annualPresident.department}
                                                        onChange={(e) => setAnnualPresident({ ...annualPresident, department: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Department"
                                                    />
                                                </div>
                                            </div>

                                            {/* Vice President */}
                                            <div className="space-y-3 pt-3 border-t border-slate-100">
                                                <h6 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Club Vice President</h6>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <input
                                                        type="text"
                                                        value={annualVicePresident.name}
                                                        onChange={(e) => setAnnualVicePresident({ ...annualVicePresident, name: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Name"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={annualVicePresident.designation}
                                                        onChange={(e) => setAnnualVicePresident({ ...annualVicePresident, designation: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Designation"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={annualVicePresident.department}
                                                        onChange={(e) => setAnnualVicePresident({ ...annualVicePresident, department: e.target.value })}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                                                        placeholder="Department"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Objectives */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">3. Club Objectives Statement</h5>
                                            <textarea
                                                rows="4"
                                                value={annualObjectives}
                                                onChange={(e) => setAnnualObjectives(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold leading-relaxed outline-none"
                                                placeholder="Write club objectives..."
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Enrollment, Coordinators & Events organized */}
                                    <div className="space-y-6">
                                        {/* Yearwise Enrollment Details */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">4. Year-Wise Enrollment Metrics</h5>
                                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                                {annualEnrollment.map((e, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl">
                                                        <input
                                                            type="text"
                                                            value={e.year}
                                                            onChange={(evt) => {
                                                                const updated = [...annualEnrollment];
                                                                updated[idx].year = evt.target.value;
                                                                setAnnualEnrollment(updated);
                                                            }}
                                                            className="w-1/2 bg-transparent text-[11px] font-black uppercase outline-none"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={e.count}
                                                            onChange={(evt) => {
                                                                const updated = [...annualEnrollment];
                                                                updated[idx].count = parseInt(evt.target.value) || 0;
                                                                setAnnualEnrollment(updated);
                                                            }}
                                                            className="flex-1 bg-transparent text-[11px] font-bold outline-none text-right"
                                                        />
                                                        <button
                                                            onClick={() => setAnnualEnrollment(annualEnrollment.filter((_, i) => i !== idx))}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                <input
                                                    type="text"
                                                    value={newEnrollYear}
                                                    onChange={(evt) => setNewEnrollYear(evt.target.value)}
                                                    placeholder="Year (e.g. III Year)"
                                                    className="w-1/2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <input
                                                    type="number"
                                                    value={newEnrollCount}
                                                    onChange={(evt) => setNewEnrollCount(evt.target.value)}
                                                    placeholder="Count"
                                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newEnrollYear && newEnrollCount) {
                                                            setAnnualEnrollment([...annualEnrollment, { year: newEnrollYear, count: parseInt(newEnrollCount) || 0 }]);
                                                            setNewEnrollYear('');
                                                            setNewEnrollCount('');
                                                        }
                                                    }}
                                                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-wider"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        {/* Student Coordinator Table */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">5. Student Executive Coordinators</h5>
                                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                                {annualCoordinators.map((c, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl">
                                                        <input
                                                            type="text"
                                                            value={c.designation}
                                                            onChange={(evt) => {
                                                                const updated = [...annualCoordinators];
                                                                updated[idx].designation = evt.target.value;
                                                                setAnnualCoordinators(updated);
                                                            }}
                                                            className="w-1/2 bg-transparent text-[11px] font-black uppercase outline-none"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={c.name}
                                                            onChange={(evt) => {
                                                                const updated = [...annualCoordinators];
                                                                updated[idx].name = evt.target.value;
                                                                setAnnualCoordinators(updated);
                                                            }}
                                                            className="flex-1 bg-transparent text-[11px] font-bold outline-none"
                                                        />
                                                        <button
                                                            onClick={() => setAnnualCoordinators(annualCoordinators.filter((_, i) => i !== idx))}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                <input
                                                    type="text"
                                                    value={newCoordDesig}
                                                    onChange={(evt) => setNewCoordDesig(evt.target.value)}
                                                    placeholder="Role (e.g. Publicity Head)"
                                                    className="w-1/2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={newCoordName}
                                                    onChange={(evt) => setNewCoordName(evt.target.value)}
                                                    placeholder="Student Name"
                                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newCoordDesig && newCoordName) {
                                                            setAnnualCoordinators([...annualCoordinators, { designation: newCoordDesig, name: newCoordName }]);
                                                            setNewCoordDesig('');
                                                            setNewCoordName('');
                                                        }
                                                    }}
                                                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-wider"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        {/* Events organized Table */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">6. Academic Year Events Summary</h5>
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                {annualEvents.map((ev, idx) => (
                                                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 relative">
                                                        <button
                                                            onClick={() => setAnnualEvents(annualEvents.filter((_, i) => i !== idx))}
                                                            className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <input
                                                                type="text"
                                                                value={ev.date}
                                                                onChange={(evt) => {
                                                                    const updated = [...annualEvents];
                                                                    updated[idx].date = evt.target.value;
                                                                    setAnnualEvents(updated);
                                                                }}
                                                                className="px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-black outline-none"
                                                                placeholder="Date"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={ev.title}
                                                                onChange={(evt) => {
                                                                    const updated = [...annualEvents];
                                                                    updated[idx].title = evt.target.value;
                                                                    setAnnualEvents(updated);
                                                                }}
                                                                className="col-span-2 px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-black outline-none"
                                                                placeholder="Title"
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={ev.objective}
                                                            onChange={(evt) => {
                                                                const updated = [...annualEvents];
                                                                updated[idx].objective = evt.target.value;
                                                                setAnnualEvents(updated);
                                                            }}
                                                            className="w-full px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-medium outline-none"
                                                            placeholder="Event Objective"
                                                        />
                                                        <textarea
                                                            rows="2"
                                                            value={ev.workDone}
                                                            onChange={(evt) => {
                                                                const updated = [...annualEvents];
                                                                updated[idx].workDone = evt.target.value;
                                                                setAnnualEvents(updated);
                                                            }}
                                                            className="w-full px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-medium outline-none"
                                                            placeholder="Work Done / Description"
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Event Row */}
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-2">
                                                <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Add New Event organized</h6>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <input
                                                        type="text"
                                                        value={newEventDate}
                                                        onChange={(evt) => setNewEventDate(evt.target.value)}
                                                        placeholder="Date (DD.MM.YYYY)"
                                                        className="px-2 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newEventTitle}
                                                        onChange={(evt) => setNewEventTitle(evt.target.value)}
                                                        placeholder="Event Title"
                                                        className="col-span-2 px-2 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={newEventObj}
                                                    onChange={(evt) => setNewEventObj(evt.target.value)}
                                                    placeholder="Event Objective"
                                                    className="w-full px-2 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"
                                                />
                                                <textarea
                                                    rows="2"
                                                    value={newEventWork}
                                                    onChange={(evt) => setNewEventWork(evt.target.value)}
                                                    placeholder="Work Done / Impact Description"
                                                    className="w-full px-2 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newEventDate && newEventTitle) {
                                                            setAnnualEvents([...annualEvents, { date: newEventDate, title: newEventTitle, objective: newEventObj || 'Domain training.', workDone: newEventWork || 'Conducted orientation and contest.' }]);
                                                            setNewEventDate('');
                                                            setNewEventTitle('');
                                                            setNewEventObj('');
                                                            setNewEventWork('');
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                                                >
                                                    + Add Event to List
                                                </button>
                                            </div>

                                            <button
                                                onClick={downloadAnnualReportPDF}
                                                disabled={isGeneratingAnnualReport}
                                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10"
                                            >
                                                {isGeneratingAnnualReport ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" /> Compiling Report...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4" /> Export Annual Report PDF
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {reportsSubTab === 'approval_letter_generator' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div>
                                    <h4 className="text-xl font-black text-slate-800 uppercase italic">Approval Letter <span className="text-blue-600">Generator</span></h4>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Generate official event proposal and permission letters for college leadership with dynamic fields</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: Letter Headers & Body */}
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">1. Letter Headers & Paragraph</h5>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Form Number</label>
                                                <input
                                                    type="text"
                                                    value={approvalFormNo}
                                                    onChange={(e) => setApprovalFormNo(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none"
                                                    placeholder="Form No..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Letter Date</label>
                                                <input
                                                    type="text"
                                                    value={approvalDate}
                                                    onChange={(e) => setApprovalDate(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none"
                                                    placeholder="DD.MM.YYYY..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Submission Target (Underlined)</label>
                                            <input
                                                type="text"
                                                value={approvalSubmissionTarget}
                                                onChange={(e) => setApprovalSubmissionTarget(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none"
                                                placeholder="Submitted for Vice Chairman Approval..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Through Line</label>
                                            <input
                                                type="text"
                                                value={approvalThrough}
                                                onChange={(e) => setApprovalThrough(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none"
                                                placeholder="Through..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                                            <input
                                                type="text"
                                                value={approvalSubject}
                                                onChange={(e) => setApprovalSubject(e.target.value)}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none"
                                                placeholder="Subject..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Body Text Paragraph</label>
                                            <textarea
                                                rows="5"
                                                value={approvalBody}
                                                onChange={(e) => setApprovalBody(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.ctrlKey && (e.key === 'b' || e.key === 'u' || e.key === 'i')) {
                                                        e.preventDefault();
                                                        const textarea = e.target;
                                                        const start = textarea.selectionStart;
                                                        const end = textarea.selectionEnd;
                                                        const text = textarea.value;
                                                        const selectedText = text.substring(start, end);
                                                        
                                                        let tagOpen = '';
                                                        let tagClose = '';
                                                        if (e.key === 'b') { tagOpen = '<b>'; tagClose = '</b>'; }
                                                        if (e.key === 'u') { tagOpen = '<u>'; tagClose = '</u>'; }
                                                        if (e.key === 'i') { tagOpen = '<i>'; tagClose = '</i>'; }

                                                        const newText = text.substring(0, start) + tagOpen + selectedText + tagClose + text.substring(end);
                                                        setApprovalBody(newText);

                                                        setTimeout(() => {
                                                            textarea.focus();
                                                            textarea.setSelectionRange(start + tagOpen.length, end + tagOpen.length);
                                                        }, 0);
                                                    }
                                                }}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                placeholder="Write the introduction paragraph here..."
                                            />
                                            <p className="text-[9px] text-slate-400 font-bold ml-1 mt-1">💡 Tip: Highlight text and press Ctrl+B (bold), Ctrl+U (underline), or Ctrl+I (italic)</p>
                                        </div>
                                    </div>

                                    {/* Right Column: Details & Signatures */}
                                    <div className="space-y-6">
                                        {/* Event Details List Editor */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">2. Event Details List (Add / Delete)</h5>
                                            
                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {approvalDetails.map((detail, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <span className="text-[10px] font-black text-slate-400 w-5">{idx + 1}.</span>
                                                        <input
                                                            type="text"
                                                            value={detail.label}
                                                            onChange={(e) => {
                                                                const updated = [...approvalDetails];
                                                                updated[idx].label = e.target.value;
                                                                setApprovalDetails(updated);
                                                            }}
                                                            className="w-1/3 bg-transparent text-[11px] font-black uppercase outline-none"
                                                            placeholder="Label"
                                                        />
                                                        <span className="text-slate-400">:</span>
                                                        <input
                                                            type="text"
                                                            value={detail.value}
                                                            onChange={(e) => {
                                                                const updated = [...approvalDetails];
                                                                updated[idx].value = e.target.value;
                                                                setApprovalDetails(updated);
                                                            }}
                                                            className="flex-1 bg-transparent text-[11px] font-bold outline-none"
                                                            placeholder="Value"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                setApprovalDetails(approvalDetails.filter((_, i) => i !== idx));
                                                            }}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                                <input
                                                    type="text"
                                                    value={newDetailLabel}
                                                    onChange={(e) => setNewDetailLabel(e.target.value)}
                                                    placeholder="New Field Label (e.g. Venue)"
                                                    className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={newDetailValue}
                                                    onChange={(e) => setNewDetailValue(e.target.value)}
                                                    placeholder="New Field Value (e.g. Auditorium)"
                                                    className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newDetailLabel && newDetailValue) {
                                                            setApprovalDetails([...approvalDetails, { label: newDetailLabel, value: newDetailValue }]);
                                                            setNewDetailLabel('');
                                                            setNewDetailValue('');
                                                        }
                                                    }}
                                                    className="col-span-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                                >
                                                    + Add Event Detail Line
                                                </button>
                                            </div>
                                        </div>

                                        {/* Dynamic Signatures Editor */}
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">3. Approval Signatures</h5>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {approvalSignatures.map((sig, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider rounded-xl border border-slate-200">
                                                        <span>{sig}</span>
                                                        <button
                                                            onClick={() => {
                                                                setApprovalSignatures(approvalSignatures.filter((_, i) => i !== idx));
                                                            }}
                                                            className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newSigName}
                                                    onChange={(e) => setNewSigName(e.target.value)}
                                                    placeholder="Signature Title (e.g. Dean)"
                                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newSigName) {
                                                            setApprovalSignatures([...approvalSignatures, newSigName]);
                                                            setNewSigName('');
                                                        }
                                                    }}
                                                    className="px-6 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                                >
                                                    Add
                                                </button>
                                            </div>

                                            <button
                                                onClick={downloadApprovalLetterPDF}
                                                disabled={isGeneratingApprovalLetter}
                                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/10"
                                            >
                                                {isGeneratingApprovalLetter ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" /> Compiling Letter...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4" /> Generate Approval Letter PDF
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'core-team':
                return (
                    <>
                        {activeTab === 'core-team' && !activeCoreTeamYear && (
                            <div className="space-y-8 animate-fade-in pb-20 max-w-4xl mx-auto mt-10">
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                                        <Award className="w-10 h-10 text-indigo-600" />
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">Core Team Assignments</h2>
                                    <p className="text-slate-500 font-medium">Select an academic year to view or manage the TechSpark club coordinators.</p>
                                </div>
            
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-12">
                                    <button 
                                        onClick={() => setShowNewYearModal(true)}
                                        className="bg-white rounded-3xl p-8 border-2 border-dashed border-slate-200 hover:border-indigo-500 flex flex-col items-center justify-center gap-4 group transition-all h-48"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-black text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">Start New Year</span>
                                    </button>
                                    
                                    {availableYears.map(year => (
                                        <button 
                                            key={year}
                                            onClick={() => setActiveCoreTeamYear(year)}
                                            className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 flex flex-col items-center justify-center gap-4 transition-all h-48 group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full pointer-events-none" />
                                            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <span className="text-xl font-black text-slate-800">{year}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
            
                        {activeTab === 'core-team' && activeCoreTeamYear && (
                            <div className="space-y-8 animate-fade-in pb-20 max-w-5xl mx-auto">
                                {/* Header */}
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                    <div>
                                        <button onClick={() => setActiveCoreTeamYear(null)} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 text-xs font-black uppercase tracking-widest mb-4 transition-colors w-fit">
                                            <ChevronRight className="w-4 h-4 rotate-180" /> Back to Years
                                        </button>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                <Award className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                                                Core Team Directory
                                            </h2>
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 tracking-widest uppercase md:ml-13">
                                            Academic Year {activeCoreTeamYear}
                                        </p>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <button onClick={generateCoreTeamReport} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2">
                                            <FileDown className="w-4 h-4" /> Download PDF Report
                                        </button>
                                    </div>
                                </div>
            
                                {/* Faculty Row */}
                                <div className="bg-slate-900 rounded-[1.5rem] border border-slate-800 shadow-xl overflow-hidden">
                                    <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors group" onClick={() => setExpandedRole(expandedRole === 'FACULTY' ? null : 'FACULTY')}>
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">
                                                <Award className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Supreme Command</p>
                                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Faculty Coordinator</h3>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-6">
                                            {coordinators.find(c => c.role === 'FACULTY COORDINATOR' && c.academicYear === activeCoreTeamYear) ? (
                                                <div className="text-right mr-2 hidden md:block group-hover:opacity-80 transition-opacity">
                                                    <p className="text-sm font-black text-white uppercase">{coordinators.find(c => c.role === 'FACULTY COORDINATOR' && c.academicYear === activeCoreTeamYear).fullName}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{coordinators.find(c => c.role === 'FACULTY COORDINATOR' && c.academicYear === activeCoreTeamYear).department}</p>
                                                </div>
                                            ) : (
                                                <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/20 mr-2">Not Assigned</span>
                                            )}
                                            <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${expandedRole === 'FACULTY' ? 'rotate-90 text-amber-500' : ''}`} />
                                        </div>
                                    </div>
            
                                    <AnimatePresence>
                                        {expandedRole === 'FACULTY' && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                <div className="p-6 pt-0 border-t border-slate-800 bg-slate-900/40">
                                                    {coordinators.find(c => c.role === 'FACULTY COORDINATOR' && c.academicYear === activeCoreTeamYear) ? (
                                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mt-6">
                                                            <div className="flex flex-col sm:flex-row gap-6 md:gap-12">
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Name</p>
                                                                    <p className="text-sm font-bold text-white uppercase">{coordinators.find(c => c.role === 'FACULTY COORDINATOR' && c.academicYear === activeCoreTeamYear).fullName}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Designation</p>
                                                                    <p className="text-sm font-bold text-white uppercase">{coordinators.find(c => c.role === 'FACULTY COORDINATOR' && c.academicYear === activeCoreTeamYear).designation}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Department</p>
                                                                    <p className="text-sm font-bold text-white uppercase">{coordinators.find(c => c.role === 'FACULTY COORDINATOR' && c.academicYear === activeCoreTeamYear).department}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-3 w-full md:w-auto">
                                                                <button onClick={(e) => { e.stopPropagation(); setIsAssigningFaculty(true); }} className="flex-1 md:flex-none px-4 py-3 bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:border-amber-500 transition-all flex items-center justify-center gap-2">
                                                                    <Edit className="w-3 h-3" /> Edit
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleRemoveCoreRole('FACULTY COORDINATOR'); }} className="flex-1 md:flex-none px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                                                                    <X className="w-3 h-3" /> Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-6 flex justify-center">
                                                            <button onClick={() => setIsAssigningFaculty(true)} className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2">
                                                                <Plus className="w-4 h-4" /> Assign Faculty Coordinator
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
            
                                {/* Student Rows */}
                                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden divide-y divide-slate-100">
                                    {CORE_ROLES.map((role, idx) => {
                                        const assigned = coordinators.find(c => c.role === role && c.academicYear === activeCoreTeamYear);
                                        const isExpanded = expandedRole === role;
            
                                        return (
                                            <div key={idx} className="group transition-colors hover:bg-slate-50/50">
                                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-4" onClick={() => setExpandedRole(isExpanded ? null : role)}>
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{role}</h3>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-6 justify-between md:justify-end">
                                                        {assigned ? (
                                                            <div className="flex items-center gap-3 text-right mr-2">
                                                                <span className="flex h-2.5 w-2.5 relative">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                                                </span>
                                                                <div className="hidden md:block group-hover:opacity-75 transition-opacity">
                                                                    <p className="text-sm font-black text-slate-800 uppercase">{assigned.fullName}</p>
                                                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{assigned.department}{assigned.yearOfStudy ? ` ΓÇó ${assigned.yearOfStudy} YEAR` : ''}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest mr-2">Vacant</span>
                                                        )}
                                                        <ChevronRight className={`w-5 h-5 text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-500' : ''}`} />
                                                    </div>
                                                </div>
            
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                            <div className="px-6 pb-6 pt-2 bg-slate-50/50 border-t border-slate-50">
                                                                {assigned ? (
                                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[1.25rem] border border-slate-200/60 shadow-sm mt-2">
                                                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 w-full max-w-5xl">
                                                                            <div>
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Name</p>
                                                                                <p className="text-sm font-bold text-slate-800 uppercase">{assigned.fullName}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Roll Number</p>
                                                                                <p className="text-sm font-bold text-slate-800 uppercase">{assigned.rollNumber}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Year</p>
                                                                                <p className="text-sm font-bold text-slate-800 uppercase">{assigned.yearOfStudy ? `${assigned.yearOfStudy} Year` : '-'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Department</p>
                                                                                <p className="text-sm font-bold text-slate-800 uppercase">{assigned.department}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                                                                <p className="text-xs font-bold text-slate-600 truncate">{assigned.email || '-'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex shrink-0 w-full md:w-auto mt-4 md:mt-0">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveCoreRole(role); }} className="w-full md:w-auto px-5 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center gap-2 shadow-sm">
                                                                                <X className="w-4 h-4" /> Remove Commander
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-4 flex justify-center mt-2">
                                                                        <button onClick={() => setIsAssigningRole(role)} className="px-8 py-3.5 bg-white border-2 border-dashed border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2">
                                                                            <Plus className="w-4 h-4" /> Select Commander
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                );
            default:
                return null;
        }
    };

    const handleAssignFaculty = async () => {
        if (!activeCoreTeamYear || !facultyForm.name) return;
        try {
            const docId = `${activeCoreTeamYear}-faculty-coordinator`;
            await setDoc(doc(db, 'coordinators', docId), {
                role: 'FACULTY COORDINATOR',
                academicYear: activeCoreTeamYear,
                fullName: facultyForm.name,
                designation: facultyForm.designation,
                department: facultyForm.department,
                updatedAt: serverTimestamp()
            });
            setIsAssigningFaculty(false);
            setCoordinators(prev => {
                const filtered = prev.filter(c => c.id !== docId);
                return [...filtered, { id: docId, role: 'FACULTY COORDINATOR', academicYear: activeCoreTeamYear, fullName: facultyForm.name, designation: facultyForm.designation, department: facultyForm.department }];
            });
        } catch (error) {
            console.error("Error assigning faculty:", error);
            alert("Failed to assign faculty.");
        }
    };

    const handleAssignCoreRole = async (student) => {
        if (!activeCoreTeamYear || !isAssigningRole || !student) return;
        try {
            const roleId = isAssigningRole.replace(/\s+/g, '-').toLowerCase();
            const docId = `${activeCoreTeamYear}-${roleId}`;
            await setDoc(doc(db, 'coordinators', docId), {
                role: isAssigningRole,
                academicYear: activeCoreTeamYear,
                studentId: student.id,
                fullName: student.fullName,
                rollNumber: student.rollNumber,
                department: student.department,
                yearOfStudy: student.yearOfStudy || '-',
                email: student.email,
                updatedAt: serverTimestamp()
            });
            setIsAssigningRole(null);
            setCoordinators(prev => {
                const filtered = prev.filter(c => c.id !== docId);
                return [...filtered, { id: docId, role: isAssigningRole, academicYear: activeCoreTeamYear, studentId: student.id, fullName: student.fullName, rollNumber: student.rollNumber, department: student.department, yearOfStudy: student.yearOfStudy || '-', email: student.email }];
            });
        } catch (error) {
            console.error("Error assigning role:", error);
            alert("Failed to assign role.");
        }
    };

    const handleRemoveCoreRole = async (role) => {
        if (!window.confirm(`Are you sure you want to remove the ${role} for ${activeCoreTeamYear}?`)) return;
        try {
            const roleId = role.replace(/\s+/g, '-').toLowerCase();
            const docId = `${activeCoreTeamYear}-${roleId}`;
            await deleteDoc(doc(db, 'coordinators', docId));
            
            setCoordinators(prev => prev.filter(c => c.id !== docId));
        } catch (error) {
            console.error("Error removing role:", error);
            alert("Failed to remove role.");
        }
    };

    const generateCoreTeamReport = async () => {
        if (!activeCoreTeamYear) return;

        // Helper: load image via <img> + canvas → base64 (works with all Vite asset URLs)
        const loadImgAsBase64 = (src) => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (e) => { console.error('Logo load failed:', src, e); resolve(null); };
            img.src = src;
        });

        const [ritB64, tsB64] = await Promise.all([loadImgAsBase64(ritLogo), loadImgAsBase64(techsparkLogo)]);

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth(); // 210mm

        // ── HEADER – clean white letterhead style ───────────────────────────
        // Top accent stripe
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, pageW, 3, 'F');

        // White header background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 3, pageW, 42, 'F');

        // RIT Logo - left (white bg, blends cleanly)
        if (ritB64) doc.addImage(ritB64, 'PNG', 8, 15, 65, 15);

        // TechSpark Logo - right
        if (tsB64) doc.addImage(tsB64, 'PNG', pageW - 59, 15, 51, 15);

        // College name & dept - centred
        doc.setTextColor(15, 30, 80);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('RAJALAKSHMI INSTITUTE OF TECHNOLOGY', pageW / 2, 14, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text('(An Autonomous Institution | Affiliated to Anna University, Chennai)', pageW / 2, 20, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.text('TECHSPARK — Student Technical Club', pageW / 2, 28, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Core Team Directory  |  Academic Year: ${activeCoreTeamYear}`, pageW / 2, 35, { align: 'center' });

        // Bottom border line under header
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.8);
        doc.line(0, 45, pageW, 45);
        doc.setLineWidth(0.2);

        // ── GENERATED DATE ───────────────────────────────────────────────────
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.text(`Generated on: ${dateStr}`, pageW - 14, 51, { align: 'right' });

        // ── FACULTY COORDINATOR LINE ─────────────────────────────────────────
        const currentTeam = coordinators.filter(c => c.academicYear === activeCoreTeamYear);
        const faculty = currentTeam.find(c => c.role === 'FACULTY COORDINATOR');
        let startY = 56;

        if (faculty) {
            doc.setFillColor(239, 246, 255); // Light blue bg
            doc.roundedRect(14, startY, pageW - 28, 10, 2, 2, 'F');
            doc.setDrawColor(191, 219, 254);
            doc.roundedRect(14, startY, pageW - 28, 10, 2, 2, 'S');
            doc.setTextColor(30, 64, 175);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Faculty Coordinator:', 18, startY + 6.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(
                `${faculty.fullName}  |  ${faculty.designation || 'Faculty'}  |  Dept. of ${faculty.department || 'N/A'}`,
                52, startY + 6.5
            );
            startY += 14;
        }

        // ── SECTION TITLE ─────────────────────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 58, 138);
        doc.text('Student Core Committee Members', 14, startY + 2);
        doc.setDrawColor(199, 210, 254);
        doc.line(14, startY + 4, pageW - 14, startY + 4);
        startY += 8;

        // ── TABLE ─────────────────────────────────────────────────────────────
        const tableBody = CORE_ROLES.map((role, idx) => {
            const member = currentTeam.find(c => c.role === role);
            if (member) {
                const yearLabel = member.yearOfStudy
                    ? (isNaN(member.yearOfStudy) ? member.yearOfStudy : `${member.yearOfStudy}${['', 'st', 'nd', 'rd', 'th'][Math.min(member.yearOfStudy, 4)]} Year`)
                    : '-';
                return [
                    idx + 1,
                    role.replace(/-/g, '\u2011'), // non-breaking hyphen for display
                    member.fullName || '-',
                    member.rollNumber || '-',
                    yearLabel,
                    member.department || '-',
                    member.email || '-'
                ];
            }
            return [idx + 1, role.replace(/-/g, '\u2011'), 'Not Assigned', '-', '-', '-', '-'];
        });

        autoTable(doc, {
            startY,
            head: [['S.No', 'Designation', 'Name', 'Roll Number', 'Year', 'Department', 'Email']],
            body: tableBody,
            theme: 'grid',
            styles: {
                fontSize: 8.5,
                cellPadding: 3,
                valign: 'middle',
                lineColor: [226, 232, 240],
                lineWidth: 0.3,
                textColor: [30, 30, 30],
                font: 'helvetica'
            },
            headStyles: {
                fillColor: [30, 58, 138],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { cellWidth: 38, fontStyle: 'bold' },
                2: { cellWidth: 30 },
                3: { cellWidth: 28, halign: 'center' },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 22 },
                6: { cellWidth: 40, fontSize: 7.5 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: (data) => {
                if (data.section === 'body' && data.cell.raw === 'Not Assigned') {
                    data.cell.styles.textColor = [148, 163, 184];
                    data.cell.styles.fontStyle = 'italic';
                }
            }
        });

        // ── FOOTER ───────────────────────────────────────────────────────────
        const finalY = doc.lastAutoTable.finalY + 10;
        const totalAssigned = currentTeam.filter(c => c.role !== 'FACULTY COORDINATOR').length;
        const totalRoles = CORE_ROLES.length;

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Total Positions: ${totalRoles}   |   Assigned: ${totalAssigned}   |   Vacant: ${totalRoles - totalAssigned}`, 14, finalY);

        // Signature lines
        const sigY = finalY + 18;
        doc.setDrawColor(180, 180, 180);
        doc.line(14, sigY, 70, sigY);
        doc.line(pageW - 70, sigY, pageW - 14, sigY);
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text('Faculty Coordinator', 14, sigY + 5);
        doc.text('Staff Advisor / HOD', pageW - 14, sigY + 5, { align: 'right' });

        // Page footer
        doc.setFontSize(7.5);
        doc.setTextColor(180, 180, 180);
        doc.text(
            'TechSpark — Rajalakshmi Institute of Technology  |  This is a computer-generated document.',
            pageW / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
        );

        doc.save(`TechSpark_CoreTeam_${activeCoreTeamYear}.pdf`);
    };

    if (!admin) return null;

    const navItems = [
        { id: 'overview', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', desc: 'Overview & Analytics' },
        { id: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Student Intel', desc: 'Demographics & Insights' },
        { id: 'core-team', icon: <Award className="w-5 h-5" />, label: 'Core Team', desc: 'Club Co-ordinators' },
        { id: 'organizers', icon: <UserCog className="w-5 h-5" />, label: 'Organizers', desc: 'Team Management', badge: organizers.length },
        { id: 'approvals', icon: <CalendarCheck className="w-5 h-5" />, label: 'Approvals', desc: 'Event Authorization', badge: events.filter(e => e.status === 'PENDING').length, badgeColor: 'orange' },
        { id: 'all_events', icon: <Calendar className="w-5 h-5" />, label: 'All Events', desc: 'Complete Registry' },
        { id: 'registrations', icon: <ClipboardList className="w-5 h-5" />, label: 'Registrations', desc: 'Participant Data' },
        { id: 'reports', icon: <PieChart className="w-5 h-5" />, label: 'Reports & Requisitions', desc: 'PDF Intelligence' },
        { id: 'submissions', icon: <Activity className="w-5 h-5" />, label: 'Quiz Scores', desc: 'Live Performance', isLive: true },
        { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings', desc: 'System Config' },
        { id: 'logs', icon: <ShieldAlert className="w-5 h-5" />, label: 'Security', desc: 'Audit Trail' }
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 w-[260px] h-[100dvh] bg-white border-r border-slate-200 z-50 flex flex-col overflow-hidden shadow-2xl lg:hidden"
                        >
                            {/* Brand Header */}
                            <div className="h-24 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex-1 flex items-center justify-center border border-amber-200/50 py-3 rounded-xl shadow-sm bg-gradient-to-br from-amber-50/50 to-orange-50/30 mr-4">
                                    <img src={techsparkLogo} alt="TechSpark" className="h-10 w-auto object-contain pr-1" />
                                </div>
                                <button 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Navigation */}
                            <div className="flex-1 overflow-y-auto py-6 pl-4 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Main Menu</p>
                                <nav className="space-y-1">
                                    {navItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${activeTab === item.id
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                        >
                                            <div className={`${activeTab === item.id ? 'text-white' : 'text-slate-400'}`}>
                                                {item.icon}
                                            </div>
                                            <span className="flex-1 text-left">{item.label}</span>
                                            {item.badge > 0 && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === item.id
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Bottom Action */}
                            <div className="p-4 pl-5 pr-2 border-t border-slate-100 shrink-0">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 hover:text-red-600 transition-all"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Minimalist Light Sidebar (Desktop) */}
            <aside className={`h-screen sticky top-0 bg-white border-r border-slate-200 hidden lg:flex flex-col z-50 transition-all duration-300 ${isCollapsed ? 'w-[88px]' : 'w-[260px]'}`}>
                {/* Brand Header */}
                <div className={`h-24 px-4 border-b border-slate-100 flex items-center shrink-0 transition-all ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-center border border-amber-200/50 py-3 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] bg-gradient-to-br from-amber-50/50 to-orange-50/30 mr-3">
                            <img src={techsparkLogo} alt="TechSpark" className="h-10 w-auto object-contain pr-1" />
                        </div>
                    )}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 pl-4 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overflow-x-hidden">
                    <p className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 transition-all whitespace-nowrap ${isCollapsed ? 'px-1 text-center' : 'px-3'}`}>
                        {isCollapsed ? '•••' : 'Main Menu'}
                    </p>
                    <nav className="space-y-1 pr-3">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-3 py-3 rounded-xl font-medium text-sm transition-all overflow-hidden ${
                                    isCollapsed ? 'justify-center px-0 w-12 mx-auto' : 'w-full px-4'
                                } ${activeTab === item.id
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                title={isCollapsed ? item.label : ""}
                            >
                                <div className={`shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`}>
                                    {item.icon}
                                </div>
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                                        {item.badge > 0 && (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${activeTab === item.id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Bottom Action */}
                <div className="p-4 pl-5 pr-2 border-t border-slate-100 shrink-0">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 hover:text-red-600 transition-all ${isCollapsed ? 'px-0 w-12 mx-auto' : 'w-full'}`}
                        title={isCollapsed ? "Logout" : ""}
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main id="main-scroll-container" className="flex-1 overflow-y-auto bg-slate-100">
                {/* Premium Header */}
                <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            className="lg:hidden p-2.5 bg-slate-100/80 hover:bg-slate-200 rounded-xl text-slate-700 transition-all border border-slate-200/50"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="text-left hidden sm:block">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                                {activeTab === 'overview' && <LayoutDashboard className="w-5 h-5 text-white" />}
                                {activeTab === 'analytics' && <BarChart3 className="w-5 h-5 text-white" />}
                                {activeTab === 'core-team' && <Award className="w-5 h-5 text-white" />}
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
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-baseline gap-2">
                                    {activeTab.replace('_', ' ')}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-4">

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
                        {(() => {
                            try {
                                return renderContent();
                            } catch (error) {
                                console.error("Error rendering content:", error);
                                return <div className="text-red-500 p-10 bg-white m-10 rounded-xl overflow-auto text-left shadow-2xl relative z-[9999]">
                                    <h1 className="text-2xl font-bold">Dashboard Crash</h1>
                                    <p className="font-bold my-4">{error.message}</p>
                                    <pre className="text-xs bg-red-50 p-4 rounded-xl">{error.stack}</pre>
                                </div>;
                            }
                        })()}
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
                                    {selectedEventDetails.status === 'LIVE' && (
                                        <button
                                            onClick={() => {
                                                setShowEventDetailModal(false);
                                                handleOpenEditLiveEvent(selectedEventDetails);
                                            }}
                                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-lg"
                                        >
                                            <Edit className="w-4 h-4" /> Edit Details
                                        </button>
                                    )}
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
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Short Description</label>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">{eventToApprove.description || eventToApprove.shortDescription || 'N/A'}</p>
                                        </div>
                                        {eventToApprove.detailedDescription && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Description</label>
                                                <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{eventToApprove.detailedDescription}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Logistics & Constraints */}
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-blue-600" /> Date & Time Schedule
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-100 text-xs">
                                                <div>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase font-black tracking-wider">Start Time</p>
                                                    <p className="font-bold text-slate-800">{eventToApprove.startDate ? `${eventToApprove.startDate} @ ${eventToApprove.startTime || 'TBA'}` : eventToApprove.date || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase font-black tracking-wider">End Time</p>
                                                    <p className="font-bold text-slate-800">{eventToApprove.endDate ? `${eventToApprove.endDate} @ ${eventToApprove.endTime || 'TBA'}` : 'N/A'}</p>
                                                </div>
                                            </div>
                                            {eventToApprove.registrationRequired && (eventToApprove.regStartDateTime || eventToApprove.regEndDateTime) && (
                                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 text-xs">
                                                    <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest mb-1">Registration Window</p>
                                                    <p className="text-slate-700 font-medium">
                                                        {eventToApprove.regStartDateTime ? new Date(eventToApprove.regStartDateTime).toLocaleString() : 'Open'} ➔ {eventToApprove.regEndDateTime ? new Date(eventToApprove.regEndDateTime).toLocaleString() : 'Close'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-200">
                                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-emerald-600" /> Venue / Base
                                            </h4>
                                            <div className="bg-white p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-medium">Venue Type</span>
                                                    <span className="font-bold text-slate-800 uppercase">{eventToApprove.venueType || 'Offline'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-medium">Location</span>
                                                    <span className="font-bold text-slate-800 uppercase">{eventToApprove.venueName || eventToApprove.venue || 'Block-B, Lab 402'}</span>
                                                </div>
                                                {eventToApprove.googleMapLink && (
                                                    <div className="pt-2 border-t border-slate-100">
                                                        <a 
                                                            href={eventToApprove.googleMapLink} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="text-blue-600 hover:text-blue-800 font-black flex items-center gap-1 uppercase tracking-wider text-[10px]"
                                                        >
                                                            View Google Map Location <ArrowUpRight className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Capacity</label>
                                                <p className="text-sm font-black text-slate-800">{(eventToApprove.maxParticipants || eventToApprove.maxNo || 100)} Members</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audience Scope</label>
                                                <p className="text-sm font-black text-slate-800 uppercase">{eventToApprove.audienceType || 'Whole College'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Eligibility Targets */}
                                {(eventToApprove.audienceType === 'Targeted' || (eventToApprove.departments && eventToApprove.departments.length > 0)) && (
                                    <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-orange-500" /> Target Demographic Eligibility
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-black">Departments</p>
                                                <p className="font-bold text-slate-800 uppercase">{eventToApprove.departments && eventToApprove.departments.length > 0 ? eventToApprove.departments.join(', ') : 'All Departments'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-black">Years of Study</p>
                                                <p className="font-bold text-slate-800 uppercase">{eventToApprove.years && eventToApprove.years.length > 0 ? eventToApprove.years.map(y => `${y} Year`).join(', ') : 'All Years'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-black">Sections</p>
                                                <p className="font-bold text-slate-800 uppercase">{eventToApprove.sections && eventToApprove.sections.length > 0 ? eventToApprove.sections.join(', ') : 'All Sections'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Team Event Configurations */}
                                {eventToApprove.isTeamEvent && (
                                    <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Users className="w-4 h-4 text-indigo-500" /> Squad / Team Event Parameters
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase font-black">Team Registration</p>
                                                <p className="font-bold text-slate-800 uppercase">Required (Squad Entry Only)</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase font-black">Team Size Range</p>
                                                <p className="font-bold text-slate-800 uppercase">{eventToApprove.minTeamSize || 1} to {eventToApprove.maxTeamSize || 4} Members</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Quiz-Specific Info */}
                                {(eventToApprove.type === 'Quiz' || eventToApprove.quizFormUrl) && (
                                    <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-purple-600" /> Quiz Integration Settings
                                        </h4>
                                        <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100/50 space-y-3 text-xs">
                                            <div>
                                                <p className="text-[9px] text-purple-600 font-black uppercase tracking-wider mb-1">External Quiz Form Link</p>
                                                {eventToApprove.quizFormUrl ? (
                                                    <a 
                                                        href={eventToApprove.quizFormUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 truncate"
                                                    >
                                                        {eventToApprove.quizFormUrl} <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </a>
                                                ) : (
                                                    <p className="text-slate-500 italic">No URL provided</p>
                                                )}
                                            </div>
                                            <div className="pt-2 border-t border-purple-100">
                                                <p className="text-[9px] text-purple-600 font-black uppercase tracking-wider mb-1.5">Collected Student Demographics</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['quizEntryName', 'quizEntryRoll', 'quizEntryDept', 'quizEntryYear', 'quizEntrySection', 'quizEntryMobile'].map(field => {
                                                        const isCollected = eventToApprove[field];
                                                        const label = field.replace('quizEntry', '').toUpperCase();
                                                        return (
                                                            <span 
                                                                key={field} 
                                                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isCollected ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-400 line-through'}`}
                                                            >
                                                                {label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Problem Statements (Hackathon) */}
                                {(eventToApprove.type === 'Hackathon' || (eventToApprove.problemStatements && eventToApprove.problemStatements.length > 0)) && (
                                    <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Brain className="w-4 h-4 text-blue-600" /> Hackathon Problem Statements
                                        </h4>
                                        <div className="space-y-4 text-xs">
                                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase font-black">Open Statement Creation</p>
                                                    <p className="font-bold text-slate-800 uppercase">{eventToApprove.allowOpenStatement ? 'Allowed' : 'Prohibited'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase font-black">On-Spot PS Allocation</p>
                                                    <p className="font-bold text-slate-800 uppercase">{eventToApprove.isOnSpotPS ? 'Yes' : 'No'}</p>
                                                </div>
                                            </div>
                                            {eventToApprove.problemStatements && eventToApprove.problemStatements.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-black">Configured Problem Statements ({eventToApprove.problemStatements.length})</p>
                                                    <div className="space-y-2">
                                                        {eventToApprove.problemStatements.map((ps, idx) => (
                                                            <div key={idx} className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl font-medium text-slate-700">
                                                                {idx + 1}. {ps}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Coordinator Details */}
                                <div className="p-6 bg-white border border-slate-100 rounded-3xl">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-blue-600" /> Operational Coordinators
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 font-black">C1</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 uppercase">{eventToApprove.coordinatorName || eventToApprove.coord1Name || 'Not Specified'}</p>
                                                <p className="text-[10px] text-slate-500 font-mono font-medium">{eventToApprove.coordinatorPhone || eventToApprove.coord1Phone || 'No Phone Record'}</p>
                                                {(eventToApprove.coordinatorEmail || eventToApprove.coord1Email) && (
                                                    <p className="text-[9px] text-slate-400 font-mono">{eventToApprove.coordinatorEmail || eventToApprove.coord1Email}</p>
                                                )}
                                            </div>
                                        </div>
                                        {eventToApprove.coord2Name && (
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 font-black">C2</div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 uppercase">{eventToApprove.coord2Name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono font-medium">{eventToApprove.coord2Phone || 'No Phone Record'}</p>
                                                    {eventToApprove.coord2Email && (
                                                        <p className="text-[9px] text-slate-400 font-mono">{eventToApprove.coord2Email}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Terms & Conditions */}
                                {eventToApprove.terms && (
                                    <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Terms & Conditions</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed italic">{eventToApprove.terms}</p>
                                    </div>
                                )}

                                {/* Internal Notes (Super Admin View Only) */}
                                {eventToApprove.internalNotes && (
                                    <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl space-y-2 text-left">
                                        <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 font-black">
                                            <Info className="w-3.5 h-3.5" /> Internal Notes from Organizer
                                        </h4>
                                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{eventToApprove.internalNotes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Footer */}
                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
                                <button
                                    onClick={async () => {
                                        const remarks = prompt("Enter rejection/revert remarks (MANDATORY):");
                                        if (!remarks) return alert("Remarks are mandatory for rejection.");
                                        
                                        const eventId = eventToApprove.id;
                                        
                                        // Optimistic state change
                                        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'REJECTED' } : e));
                                        setShowApproveModal(false);
                                        
                                        try {
                                            await updateDoc(doc(db, 'events', eventId), {
                                                status: 'REJECTED',
                                                remarks,
                                                lastActionBy: admin.username,
                                                lastActionAt: serverTimestamp()
                                            });
                                            fetchDashboardData(true); // silent refresh
                                        } catch (err) {
                                            console.error(err);
                                            alert("Database update failed. Reverting state...");
                                            fetchDashboardData(); // full refresh fallback
                                        }
                                    }}
                                    className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Reject Submission
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm("Authorize this event for LIVE broadcast? This will make it visible to all students.")) return;
                                        
                                        const eventId = eventToApprove.id;
                                        
                                        // Optimistic state change
                                        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'LIVE' } : e));
                                        setShowApproveModal(false);
                                        
                                        try {
                                            await updateDoc(doc(db, 'events', eventId), {
                                                status: 'LIVE',
                                                remarks: 'Approved by Super Admin after technical review',
                                                lastActionBy: admin.username,
                                                lastActionAt: serverTimestamp()
                                            });
                                            fetchDashboardData(true); // silent refresh
                                        } catch (err) {
                                            console.error(err);
                                            alert("Database update failed. Reverting state...");
                                            fetchDashboardData(); // full refresh fallback
                                        }
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
                                    <h3 className="text-xl font-bold text-slate-800">Edit Student Profile</h3>
                                    <p className="text-slate-500 text-sm mt-1">Update student details and academic information</p>
                                </div>
                                <button onClick={() => setIsEditStudentModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveStudent} className="p-8 space-y-5 text-left bg-[#fcfdfe]">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700 ml-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={editingStudent.fullName}
                                        disabled
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700 ml-1">Register Number</label>
                                        <input
                                            required
                                            type="text"
                                            value={editingStudent.rollNumber}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, rollNumber: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono font-medium text-sm text-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700 ml-1">Academic Department</label>
                                        <select
                                            disabled
                                            value={editingStudent.department}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-500 cursor-not-allowed"
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
                                        <label className="block text-sm font-medium text-slate-700 ml-1">Study Year</label>
                                        <select
                                            value={editingStudent.yearOfStudy}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, yearOfStudy: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-800"
                                        >
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3">3rd Year</option>
                                            <option value="4">4th Year</option>
                                            <option value="Alumni">Alumni</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700 ml-1">Section</label>
                                        <select
                                            value={editingStudent.section}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, section: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-800"
                                        >
                                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(sec => (
                                                <option key={sec} value={sec}>Sec {sec}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700 ml-1">Batch Year</label>
                                        <input
                                            type="text"
                                            value={editingStudent.admissionYear}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, admissionYear: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium tabular-nums text-slate-800"
                                            placeholder="e.g. 2024"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700 ml-1">Email Address</label>
                                        <input
                                            required
                                            type="email"
                                            value={editingStudent.email}
                                            disabled
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="block text-sm font-medium text-slate-700">Gender</label>
                                            {editingStudent.gender && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm("Revert gender? This will trigger the update prompt for the student.")) {
                                                            setEditingStudent({ ...editingStudent, gender: '' });
                                                        }
                                                    }}
                                                    className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-all"
                                                >
                                                    <RotateCcw className="w-3 h-3" /> Revert
                                                </button>
                                            )}
                                        </div>
                                        <select
                                            value={editingStudent.gender || ''}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-800"
                                        >
                                            <option value="">Not Set / Revert</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    Save Changes
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
                            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] shadow-2xl flex flex-col border border-white/20"
                        >
                            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
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

                            <div className="p-6">
                                <div className="flex justify-center">
                                    <div className="w-64 h-64 sm:w-[300px] sm:h-[300px] bg-slate-950 rounded-[2.5rem] overflow-hidden relative border-4 border-slate-100 shadow-inner">
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
                                        <div className="absolute inset-0 border-[3px] border-blue-500/30 m-8 sm:m-10 rounded-[2rem] pointer-events-none">
                                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                                        </div>
                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan z-20" />
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-row items-center justify-between gap-4">
                                    <p className="text-left text-slate-400 text-[9px] font-black uppercase tracking-widest leading-relaxed">
                                        Position the Student QR Code<br />for instantaneous recognition
                                    </p>
                                    
                                    {/* Institution & Event Branding */}
                                    <div className="flex items-center gap-5">
                                        <img src={ritLogo} alt="RIT" className="h-9 object-contain" />
                                        <div className="w-px h-8 bg-slate-200" />
                                        <img src={techsparkLogo} alt="TechSpark" className="h-6 object-contain" />
                                    </div>
                                </div>
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

            {/* Edit Live Event Modal */}
            <AnimatePresence>
                {isEditLiveEventModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsEditLiveEventModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-500 p-6 rounded-t-3xl z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Edit className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                                Edit Live Event
                                            </h2>
                                            <p className="text-sm text-white/80 font-bold mt-0.5">
                                                {eventToEdit?.title}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsEditLiveEventModalOpen(false)}
                                        className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 space-y-6">
                                {/* Event Time */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-wider">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                        Event Time
                                    </label>
                                    <input
                                        type="text"
                                        value={liveEventEditData.time}
                                        onChange={(e) => setLiveEventEditData({ ...liveEventEditData, time: e.target.value })}
                                        placeholder="e.g., 10:00 AM - 12:00 PM"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition-all font-bold text-slate-800"
                                    />
                                    <p className="text-xs text-slate-500 font-medium ml-1">
                                        Format: HH:MM AM/PM - HH:MM AM/PM
                                    </p>
                                </div>

                                {/* Event Venue */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-wider">
                                        <MapPin className="w-4 h-4 text-pink-600" />
                                        Event Venue
                                    </label>
                                    <input
                                        type="text"
                                        value={liveEventEditData.venue}
                                        onChange={(e) => setLiveEventEditData({ ...liveEventEditData, venue: e.target.value })}
                                        placeholder="e.g., Main Auditorium, Block A"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-pink-500 focus:bg-white transition-all font-bold text-slate-800"
                                    />
                                </div>

                                {/* Team Size (only for team events) */}
                                {eventToEdit?.isTeamEvent && (
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-wider">
                                            <Users className="w-4 h-4 text-blue-600" />
                                            Max Team Size
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={liveEventEditData.maxTeamSize}
                                            onChange={(e) => setLiveEventEditData({ ...liveEventEditData, maxTeamSize: e.target.value })}
                                            placeholder="e.g., 4"
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800"
                                        />
                                        <p className="text-xs text-slate-500 font-medium ml-1">
                                            Team size must be between 1 and 10 members
                                        </p>
                                    </div>
                                )}

                                {/* Info Note */}
                                <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4">
                                    <div className="flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black text-blue-700 uppercase mb-1">Important Note</p>
                                            <p className="text-xs text-blue-600 font-medium leading-relaxed">
                                                Only LIVE events can be edited. Once saved, students will see the updated information immediately on their dashboards.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 rounded-b-3xl flex gap-4">
                                <button
                                    onClick={() => setIsEditLiveEventModalOpen(false)}
                                    disabled={isSavingLiveEventEdit}
                                    className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveLiveEventEdit}
                                    disabled={isSavingLiveEventEdit}
                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSavingLiveEventEdit ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Academic Year Modal */}
            <AnimatePresence>
                {showNewYearModal && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewYearModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden">
                            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Start New Year</h3>
                                <button onClick={() => setShowNewYearModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Academic Year (e.g. 2026-2027)</label>
                                    <input 
                                        type="text" 
                                        value={newYearInput} 
                                        onChange={e => setNewYearInput(e.target.value)} 
                                        placeholder="YYYY-YYYY"
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all text-center tracking-widest" 
                                    />
                                </div>
                                <button 
                                    onClick={() => {
                                        if(newYearInput.trim().length > 4) {
                                            setActiveCoreTeamYear(newYearInput.trim());
                                            setShowNewYearModal(false);
                                            setNewYearInput('');
                                        }
                                    }} 
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" /> Create & Enter
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>




























































































































































































































            {/* Role Assignment Modal */}
            <AnimatePresence>
                {isAssigningRole && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAssigningRole(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-100"
                        >
                            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                        Assign {isAssigningRole}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsAssigningRole(null)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 border-b border-slate-100">
                                <div className="relative">
                                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by Name or Roll Number..."
                                        value={coreSearchQuery}
                                        onChange={(e) => setCoreSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase placeholder:normal-case"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <div className="space-y-2">
                                    {allStudents
                                        .filter(s => 
                                            (s.fullName || '').toLowerCase().includes(coreSearchQuery.toLowerCase()) || 
                                            (s.rollNumber || '').toLowerCase().includes(coreSearchQuery.toLowerCase())
                                        )
                                        .slice(0, 15) // Limit to 15 results for performance
                                        .map(student => (
                                            <div key={student.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer" onClick={() => handleAssignCoreRole(student)}>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.fullName}</h4>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-1">{student.rollNumber} • {student.yearOfStudy ? `${student.yearOfStudy} Year • ` : ''}{student.department}</p>
                                                </div>
                                                <button className="shrink-0 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                                    Select
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Faculty Assignment Modal */}
            <AnimatePresence>
                {isAssigningFaculty && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAssigningFaculty(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
                        >
                            <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                        Assign Faculty Coordinator
                                    </h3>
                                </div>
                                <button onClick={() => setIsAssigningFaculty(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-4 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                                    <input type="text" value={facultyForm.name} onChange={e => setFacultyForm({...facultyForm, name: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-amber-500 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation</label>
                                    <input type="text" value={facultyForm.designation} onChange={e => setFacultyForm({...facultyForm, designation: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-amber-500 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</label>
                                    <input type="text" value={facultyForm.department} onChange={e => setFacultyForm({...facultyForm, department: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-amber-500 transition-all" />
                                </div>
                                
                                <button onClick={handleAssignFaculty} className="w-full py-4 mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Save Faculty Coordinator
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

