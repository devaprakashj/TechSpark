import { createContext, useState, useContext, useEffect } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { auth, googleProvider, db } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // State to handle the intermediate registration step
    const [pendingUser, setPendingUser] = useState(null);
    const [isRegistrationStep, setIsRegistrationStep] = useState(false);
    const [showBadge, setShowBadge] = useState(false);
    const [signingIn, setSigningIn] = useState(false);

    useEffect(() => {
        let unsubscribeUser = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // 1. Check Domain
                if (!currentUser.email.endsWith('ritchennai.edu.in')) {
                    await signOut(auth);
                    alert("Access Denied: Please use your college email (@ritchennai.edu.in)");
                    setUser(null);
                    setLoading(false);
                    return;
                }

                // 2. Real-time Profile Sync
                const userDocRef = doc(db, 'users', currentUser.uid);

                unsubscribeUser = onSnapshot(userDocRef, (userSnapshot) => {
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.data();

                        // Dynamic year sync
                        if (userData.admissionYear) {
                            const now = new Date();
                            const academicYearRef = (now.getMonth() + 1) < 6 ? now.getFullYear() - 1 : now.getFullYear();
                            const calculatedYear = academicYearRef - parseInt(userData.admissionYear) + 1;
                            if (calculatedYear > 0 && calculatedYear <= 4) {
                                userData.yearOfStudy = calculatedYear;
                            } else if (calculatedYear > 4) {
                                userData.yearOfStudy = 'Alumni';
                            }
                        }

                        setUser({ ...userData, uid: currentUser.uid });
                        setIsAuthModalOpen(false);
                        setLoading(false);
                    } else {
                        handleNewUser(currentUser);
                    }
                }, (error) => {
                    console.error("User sync error:", error);
                    setLoading(false);
                });
            } else {
                if (unsubscribeUser) unsubscribeUser();
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
        };
    }, []);

    const handleNewUser = async (currentUser) => {
        try {
            const emailParts = currentUser.email.split('@');
            const localPart = emailParts[0];
            const domainPart = emailParts[1];

            let department = '';
            let rollNo = '';
            let admissionYear = '';

            // Check email format by analyzing domain structure
            const domainSegments = domainPart.split('.');

            // NEW FORMAT: name.rollnumber@dept.ritchennai.edu.in (2024 batch onwards)
            // Example: antojenishia.240007@aiml.ritchennai.edu.in
            if (domainSegments.length === 4 && domainSegments[1] === 'ritchennai') {
                console.log("Detected NEW email format (2024+)");

                // Department from subdomain
                department = domainSegments[0].toUpperCase(); // aiml -> AIML

                // Roll number from local part (last segment after dot)
                const localSegments = localPart.split('.');
                rollNo = localSegments[localSegments.length - 1]; // 240007

                // Extract year from roll number (first 2 digits)
                const shortYear = rollNo.substring(0, 2);
                admissionYear = 2000 + parseInt(shortYear); // 24 -> 2024
            }
            // OLD FORMAT: name.initial.year.dept@ritchennai.edu.in (2023 batch)
            // Example: jananishree.m.2023.ece@ritchennai.edu.in
            else if (domainSegments.length === 3 && domainSegments[0] === 'ritchennai') {
                console.log("Detected OLD email format (2023 and earlier)");

                // Split local part
                const localSegments = localPart.split('.');

                // Department from last segment of local part
                department = localSegments[localSegments.length - 1].toUpperCase(); // ece -> ECE

                // Year from second last segment
                rollNo = localSegments[localSegments.length - 2]; // 2023

                // Extract admission year
                const shortYear = rollNo.substring(0, 2);
                admissionYear = 2000 + parseInt(shortYear); // 20 -> 2020 or 23 -> 2023
            }

            if (!department || !admissionYear) {
                throw new Error("Unable to parse email format");
            }

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            const academicYearRef = currentMonth < 6 ? currentYear - 1 : currentYear;
            const yearOfStudy = academicYearRef - admissionYear + 1;

            setPendingUser({
                uid: currentUser.uid,
                email: currentUser.email,
                fullName: currentUser.displayName,
                rollNumber: '', // Required manual entry or scan as per protocol
                department: department,
                admissionYear: admissionYear,
                yearOfStudy: yearOfStudy > 0 && yearOfStudy <= 4 ? yearOfStudy : (yearOfStudy > 4 ? 'Alumni' : 1)
            });
            setIsRegistrationStep(true);
            setIsAuthModalOpen(true);
            setLoading(false);
        } catch (error) {
            console.error("Error parsing email:", error);
            setPendingUser({
                uid: currentUser.uid,
                email: currentUser.email,
                fullName: currentUser.displayName,
                rollNumber: '',
                department: '',
                admissionYear: '',
                yearOfStudy: ''
            });
            setIsRegistrationStep(true);
            setIsAuthModalOpen(true);
            setLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        if (signingIn) return;
        setSigningIn(true);
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
                console.error("Login failed", error);
                alert("Login failed: " + error.message);
            }
        } finally {
            setSigningIn(false);
        }
    };

    const completeRegistration = async (finalData) => {
        if (!pendingUser) return;

        // Calculate current year of study dynamically based on academic cycle (Starts in June)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const academicYearRef = currentMonth < 6 ? currentYear - 1 : currentYear;
        const admissionYear = parseInt(finalData.admissionYear);
        const yearOfStudy = academicYearRef - admissionYear + 1;

        const isAlumni = yearOfStudy > 4;

        const userData = {
            fullName: pendingUser.fullName,
            email: pendingUser.email,
            rollNumber: finalData.rollNumber,
            department: finalData.department,
            section: finalData.section,
            phone: finalData.phone,
            admissionYear: admissionYear,
            yearOfStudy: isAlumni ? 'Alumni' : yearOfStudy,
            role: isAlumni ? 'alumni' : 'student',
            points: 10, // Initial signup points
            badges: ['spark-starter'], // First badge unlocked
            createdAt: serverTimestamp(),
        };

        try {
            // 1. Save User Profile
            await setDoc(doc(db, 'users', pendingUser.uid), userData);

            // 2. Send Welcome Email via EmailJS (100% Free)
            // NOTE: Use your Gmail (techspark@ritchennai.edu.in) and App Password in EmailJS Dashboard Services
            const emailParams = {
                to_name: userData.fullName,
                to_email: userData.email,
                roll_number: userData.rollNumber,
                department: userData.department,
                section: userData.section,
                dashboard_link: `${window.location.origin}/dashboard`
            };

            emailjs.send(
                'YOUR_SERVICE_ID', // Replace this with the ID from EmailJS after connecting your Gmail
                'YOUR_TEMPLATE_ID', // Replace this with your Template ID
                emailParams,
                'YOUR_PUBLIC_KEY' // Replace this with your Public Key
            ).then(() => {
                console.log("Welcome email sent via TechSpark Gmail!");
            }).catch((err) => {
                console.warn("Email trigger connection active, but IDs are missing:", err);
            });

            setUser({ ...userData, uid: pendingUser.uid });
            setPendingUser(null);
            setIsRegistrationStep(false);
            setIsAuthModalOpen(false);
            setShowBadge(true); // Trigger celebratory badge popup!
            // alert("Registration Completed! Check your email for a welcome message. 📩");
        } catch (error) {
            console.error("Error saving user data:", error);
            alert("Failed to save profile. Please try again.");
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setPendingUser(null);
        setIsRegistrationStep(false);
    };

    const openAuthModal = () => setIsAuthModalOpen(true);
    const closeAuthModal = () => {
        if (isRegistrationStep) {
            // Use must complete registration if they are in that step, 
            // otherwise verify logout logic or forced stay
            if (confirm("You must complete registration to continue. Cancel to logout?")) {
                logout();
                setIsAuthModalOpen(false);
            }
        } else {
            setIsAuthModalOpen(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAuthModalOpen,
            isRegistrationStep,
            pendingUser,
            loginWithGoogle,
            completeRegistration,
            logout,
            openAuthModal,
            closeAuthModal,
            showBadge,
            setShowBadge,
            isAuthenticated: !!user
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
