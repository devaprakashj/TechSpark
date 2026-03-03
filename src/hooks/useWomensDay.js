import { useState, useEffect, useCallback } from 'react';
import {
    doc, getDoc, setDoc, addDoc, updateDoc,
    collection, query, where, getDocs,
    serverTimestamp, increment, onSnapshot, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { filterMessage, isOptInWindowOpen, isSendWindowOpen, isMessagesReleased } from '../utils/wdUtils';

const RATE_LIMIT_MAX_ATTEMPTS = 5;   // per minute
const MAX_MESSAGES_PER_SENDER = 3;

// ─── useWomensDay hook ────────────────────────────────────────────────────────
export function useWomensDay(user) {
    const [participation, setParticipation] = useState(null);   // my opt-in doc
    const [inbox, setInbox] = useState([]);      // messages I received
    const [sentMessages, setSentMessages] = useState([]);      // messages I sent
    const [loadingPart, setLoadingPart] = useState(true);
    const [settings, setSettings] = useState(null);

    // Use rollNumber/registerNumber as primary identifier; fallback to UID for session only
    const myRegNo = user?.rollNumber || user?.registerNumber || user?.uid;
    const canParticipate = !!(user?.rollNumber || user?.registerNumber);

    // ── Real-time: global settings ───────────────────────────────────────────
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'wdSettings', 'global'), snap => {
            setSettings(snap.exists() ? snap.data() : { manualRelease: false });
        });
        return unsub;
    }, []);

    // ── Real-time: my opt-in status ──────────────────────────────────────────
    useEffect(() => {
        if (!myRegNo) { setLoadingPart(false); return; }

        // Check by canonical ID (roll number)
        const canonicalId = user?.rollNumber || user?.registerNumber;
        const ref = doc(db, 'wdParticipants', canonicalId || user?.uid);

        const unsub = onSnapshot(ref, snap => {
            setParticipation(snap.exists() ? snap.data() : null);
            setLoadingPart(false);
        });
        return unsub;
    }, [myRegNo, user?.rollNumber, user?.registerNumber, user?.uid]);

    // ── Real-time: messages I received (only released approved) ──────────────
    useEffect(() => {
        if (!myRegNo) return;

        // We query by the same ID senders use (roll number preferred)
        const q = query(
            collection(db, 'wdMessages'),
            where('receiverRegNo', '==', myRegNo),
            where('status', '==', 'approved'),
            orderBy('timestamp', 'desc')
        );
        const unsub = onSnapshot(q, snap => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setInbox(msgs);
        });
        return unsub;
    }, [myRegNo]);

    // ── Real-time: messages I sent ────────────────────────────────────────────
    useEffect(() => {
        if (!myRegNo) return;
        const q = query(
            collection(db, 'wdMessages'),
            where('senderRegNo', '==', myRegNo),
            orderBy('timestamp', 'desc')
        );
        const unsub = onSnapshot(q, snap => {
            setSentMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, [myRegNo]);

    // ── Opt-in ────────────────────────────────────────────────────────────────
    const optIn = useCallback(async () => {
        if (!user) throw new Error('Not logged in');

        const canonicalId = user?.rollNumber || user?.registerNumber;
        if (!canonicalId) {
            throw new Error('Identification failed: Please update your "Academic Profile" with your Register Number before opting in.');
        }

        if (user?.gender !== 'Female') {
            throw new Error('Women\'s Day participation is currently limited to female students only.');
        }

        const autoDeactivate = new Date('2026-03-09T00:00:00+05:30');
        await setDoc(doc(db, 'wdParticipants', canonicalId), {
            rollNumber: canonicalId,
            uid: user.uid,
            name: user?.fullName || '',
            department: user?.department || '',
            batch: user?.batch || user?.admissionYear || '',
            optedIn: true,
            optedInAt: serverTimestamp(),
            autoDeactivateAt: autoDeactivate,
        });
        await logAction(canonicalId, 'OPT_IN', { uid: user.uid });
    }, [user]);

    // ── Opt-out ───────────────────────────────────────────────────────────────
    const optOut = useCallback(async () => {
        const canonicalId = user?.rollNumber || user?.registerNumber || user?.uid;
        if (!canonicalId) throw new Error('Not logged in');
        await updateDoc(doc(db, 'wdParticipants', canonicalId), { optedIn: false });
        await logAction(canonicalId, 'OPT_OUT', {});
    }, [user]);

    // ── Check rate limit ──────────────────────────────────────────────────────
    const checkRateLimit = useCallback(async () => {
        if (!myRegNo) return { allowed: false, reason: 'Session expired' };
        const ref = doc(db, 'wdRateLimits', myRegNo);
        const snap = await getDoc(ref);
        const data = snap.data() || {};
        const now = Date.now();
        const oneMinAgo = now - 60 * 1000;
        const lastMs = data.lastAttemptAt?.toMillis?.() || 0;

        if (lastMs < oneMinAgo) {
            // reset window
            await setDoc(ref, { validationAttempts: 1, lastAttemptAt: serverTimestamp() }, { merge: true });
            return { allowed: true };
        }
        if ((data.validationAttempts || 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
            return { allowed: false, reason: 'Too many attempts. Please wait 1 minute.' };
        }
        await updateDoc(ref, { validationAttempts: increment(1), lastAttemptAt: serverTimestamp() });
        return { allowed: true };
    }, [myRegNo]);

    // ── Validate receiver reg no ──────────────────────────────────────────────
    const validateReceiver = useCallback(async (receiverRegNo) => {
        const rl = await checkRateLimit();
        if (!rl.allowed) return { valid: false, reason: rl.reason };

        let studentData = null;
        let foundRegNo = receiverRegNo;
        const regNoNum = parseInt(receiverRegNo, 10);
        const hasNum = !isNaN(regNoNum);

        // helper to check a collection for any of the common register number fields
        const findInCollection = async (collName) => {
            // Check by document ID first (sometimes document IDs are reg numbers)
            try {
                const docRef = doc(db, collName, receiverRegNo);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) return docSnap.data();
            } catch (e) {
                console.log(`DocID check failed for ${collName}`);
            }

            const fields = [
                'rollNumber', 'registerNumber', 'rollNo', 'regNo',
                'studentRoll', 'registrationNumber', 'regNumber',
                'roll_number', 'register_number', 'student_roll'
            ];

            for (const field of fields) {
                try {
                    // Try string match
                    const qStr = query(collection(db, collName), where(field, '==', receiverRegNo));
                    const snapStr = await getDocs(qStr);
                    if (!snapStr.empty) return snapStr.docs[0].data();

                    // Try number match if possible
                    if (hasNum) {
                        const qNum = query(collection(db, collName), where(field, '==', regNoNum));
                        const snapNum = await getDocs(qNum);
                        if (!snapNum.empty) return snapNum.docs[0].data();
                    }
                } catch (e) {
                    console.log(`Lookup failed for ${collName}.${field}`);
                }
            }
            return null;
        };

        // 1. Check active users
        studentData = await findInCollection('users');

        // 2. If not found, check master student list
        if (!studentData) {
            studentData = await findInCollection('students');
        }

        // 3. Fallback to participation list itself
        if (!studentData) {
            studentData = await findInCollection('wdParticipants');
        }

        if (!studentData) return { valid: false, reason: 'Student not found in database.' };

        // Normalize student data
        const student = {
            fullName: studentData.fullName || studentData.name || 'Anonymous',
            department: studentData.department || studentData.studentDept || 'N/A',
            admissionYear: studentData.admissionYear || studentData.batch || studentData.year || 'N/A',
            gender: studentData.gender || 'Female',
            rollNumber: studentData.rollNumber || studentData.registerNumber || studentData.rollNo || studentData.regNo || receiverRegNo
        };

        foundRegNo = student.rollNumber;

        if (student.gender !== 'Female') {
            return { valid: false, reason: 'This feature is for sending messages to female students for Women\'s Day.' };
        }

        // check participant opt-in
        const partSnap = await getDoc(doc(db, 'wdParticipants', foundRegNo.toString()));
        let optedIn = partSnap.exists() && partSnap.data().optedIn;

        if (!optedIn) {
            // Check by original input string
            const altSnap = await getDoc(doc(db, 'wdParticipants', receiverRegNo));
            if (altSnap.exists() && altSnap.data().optedIn) {
                optedIn = true;
            }
        }

        if (!optedIn && studentData.uid) {
            // Check by student's UID (for cases where they opted in via old system)
            const uidSnap = await getDoc(doc(db, 'wdParticipants', studentData.uid));
            if (uidSnap.exists() && uidSnap.data().optedIn) {
                optedIn = true;
            }
        }

        if (!optedIn) {
            return { valid: false, reason: 'This student is not participating in Women\'s Day event (they must opt-in first).' };
        }

        // Auto-deactivate check
        const partDoc = partSnap.exists() ? partSnap.data() : (await getDoc(doc(db, 'wdParticipants', receiverRegNo))).data();
        const deactivateAt = partDoc?.autoDeactivateAt?.toDate?.();
        if (deactivateAt && new Date() > deactivateAt) {
            return { valid: false, reason: 'Women\'s Day event has ended.' };
        }

        return {
            valid: true,
            receiver: {
                regNo: foundRegNo,
                name: student.fullName,
                department: student.department,
                batch: student.admissionYear
            }
        };
    }, [checkRateLimit]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (receiverRegNo, messageText) => {
        if (!myRegNo) throw new Error('Not logged in');

        // Message count check
        if (sentMessages.length >= MAX_MESSAGES_PER_SENDER) {
            return { success: false, reason: `Message limit reached (${MAX_MESSAGES_PER_SENDER}/${MAX_MESSAGES_PER_SENDER}). No more messages allowed.` };
        }

        // Duplicate check
        const alreadySent = sentMessages.some(m => m.receiverRegNo === receiverRegNo);
        if (alreadySent) {
            return { success: false, reason: 'You have already sent a message to this student.' };
        }

        // Can't message yourself
        if (receiverRegNo === myRegNo) {
            return { success: false, reason: 'You cannot send a message to yourself.' };
        }

        // Bad-word filter
        const { isClean, flaggedWords, sanitized } = filterMessage(messageText);
        const releaseAt = new Date('2026-03-08T03:30:00Z'); // 9AM IST

        const msgData = {
            senderRegNo: myRegNo,
            senderName: user?.fullName || 'Anonymous',
            receiverRegNo,
            messageText,
            sanitizedText: sanitized,
            status: isClean ? 'pending' : 'flagged',
            flaggedWords,
            timestamp: serverTimestamp(),
            releaseAt,
            adminNote: '',
        };

        await addDoc(collection(db, 'wdMessages'), msgData);
        await logAction(myRegNo, 'SEND_MESSAGE', { receiverRegNo, status: msgData.status });

        return { success: true, status: msgData.status };
    }, [myRegNo, sentMessages, user]);

    return {
        participation, inbox, sentMessages, loadingPart,
        optIn, optOut, validateReceiver, sendMessage,
        sentCount: sentMessages.length,
        maxMessages: MAX_MESSAGES_PER_SENDER,
        isOptInOpen: isOptInWindowOpen(),
        isSendOpen: isSendWindowOpen(),
        isReleased: isMessagesReleased() || settings?.manualRelease === true,
        isFemale: user?.gender === 'Female',
        settings
    };
}

// ─── Admin hook ───────────────────────────────────────────────────────────────
export function useWomensDayAdmin() {
    const [messages, setMessages] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'wdSettings', 'global'), snap => {
            setSettings(snap.exists() ? snap.data() : { manualRelease: false });
        });
        return unsub;
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'wdMessages'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'wdParticipants'), snap => {
            setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'wdLogs'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, []);

    const approveMessage = useCallback(async (msgId, adminNote = '') => {
        await updateDoc(doc(db, 'wdMessages', msgId), {
            status: 'approved',
            adminNote,
            approvedAt: serverTimestamp(),
        });
    }, []);

    const rejectMessage = useCallback(async (msgId, adminNote = '') => {
        await updateDoc(doc(db, 'wdMessages', msgId), {
            status: 'rejected',
            adminNote,
            rejectedAt: serverTimestamp(),
        });
    }, []);

    const stats = {
        total: messages.length,
        pending: messages.filter(m => m.status === 'pending').length,
        approved: messages.filter(m => m.status === 'approved').length,
        rejected: messages.filter(m => m.status === 'rejected').length,
        flagged: messages.filter(m => m.status === 'flagged').length,
        participants: participants.filter(p => p.optedIn).length,
    };

    const toggleManualRelease = useCallback(async (released) => {
        await setDoc(doc(db, 'wdSettings', 'global'), {
            manualRelease: released,
            lastModified: serverTimestamp()
        }, { merge: true });
    }, []);

    return {
        messages, participants, logs, loading,
        approveMessage, rejectMessage, toggleManualRelease,
        settings, stats
    };
}

// ─── Helper: action logger ────────────────────────────────────────────────────
async function logAction(regNo, action, meta) {
    try {
        await addDoc(collection(db, 'wdLogs'), {
            regNo, action, meta,
            timestamp: serverTimestamp(),
        });
    } catch (_) { /* non-critical */ }
}
