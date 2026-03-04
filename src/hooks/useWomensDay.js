import { useState, useEffect, useCallback } from 'react';
import {
    doc, getDoc, setDoc, addDoc, updateDoc,
    collection, query, where, getDocs,
    serverTimestamp, increment, onSnapshot, orderBy, limit
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
        if (!user?.uid) {
            setInbox([]);
            return;
        }

        // Build exhaustive identity set
        const ids = new Set([user.uid, user.uid.toString()]);

        // From user object
        [user.rollNumber, user.registerNumber].forEach(val => {
            if (val) {
                const s = val.toString().trim();
                if (s) {
                    ids.add(s);
                    const n = parseInt(s, 10);
                    if (!isNaN(n)) ids.add(n);
                }
            }
        });

        // From participation record
        if (participation?.rollNumber) {
            const s = participation.rollNumber.toString().trim();
            if (s) {
                ids.add(s);
                const n = parseInt(s, 10);
                if (!isNaN(n)) ids.add(n);
            }
        }

        const uniqueIds = [...ids].filter(Boolean);
        console.log("WD_DEBUG: Active Inbox Filters:", uniqueIds);

        // We use two parallel listeners to ensure absolute reliability
        const qByRegNo = query(
            collection(db, 'wdMessages'),
            where('receiverRegNo', 'in', uniqueIds),
            where('status', '==', 'approved')
        );

        const qByUid = query(
            collection(db, 'wdMessages'),
            where('receiverUid', '==', user.uid),
            where('status', '==', 'approved')
        );

        let resultsByReg = [];
        let resultsByUid = [];

        const updateCombinedInbox = () => {
            const all = [...resultsByReg, ...resultsByUid];
            const unique = [];
            const seen = new Set();
            for (const m of all) {
                if (!seen.has(m.id)) {
                    unique.push(m);
                    seen.add(m.id);
                }
            }
            unique.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
            setInbox(unique);
        };

        const unsubReg = onSnapshot(qByRegNo, snap => {
            resultsByReg = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateCombinedInbox();
        }, err => console.error("WD_INBOX_REG_ERR:", err));

        const unsubUid = onSnapshot(qByUid, snap => {
            resultsByUid = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateCombinedInbox();
        }, err => console.error("WD_INBOX_UID_ERR:", err));

        return () => { unsubReg(); unsubUid(); };
    }, [user?.uid, user?.rollNumber, user?.registerNumber, participation?.rollNumber]);

    // ── Real-time: messages I sent ────────────────────────────────────────────
    useEffect(() => {
        if (!user?.uid) return;

        const ids = new Set([user.uid]);
        if (user.rollNumber) {
            ids.add(user.rollNumber.toString().trim());
            const num = parseInt(user.rollNumber, 10);
            if (!isNaN(num)) ids.add(num);
        }
        const uniqueIds = [...ids];

        // removed orderBy to avoid index requirement
        const q = query(
            collection(db, 'wdMessages'),
            where('senderRegNo', 'in', uniqueIds)
        );

        const unsub = onSnapshot(q, snap => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            msgs.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
            setSentMessages(msgs);
        }, (err) => console.error("WD_SENT_ERROR:", err));

        return unsub;
    }, [user?.uid, user?.rollNumber]);

    // ── Opt-in ────────────────────────────────────────────────────────────────
    const optIn = useCallback(async () => {
        if (!user) throw new Error('Not logged in');

        const canonicalId = (user?.rollNumber || user?.registerNumber || '').toString().trim();
        if (!canonicalId) {
            throw new Error('Identification failed: Please update your "Academic Profile" with your Register Number before opting in.');
        }

        if (user?.gender !== 'Female') {
            throw new Error('Women\'s Day participation is currently limited to female students only.');
        }

        const autoDeactivateAt = new Date('2026-03-09T00:00:00+05:30');
        await setDoc(doc(db, 'wdParticipants', canonicalId), {
            rollNumber: canonicalId,
            uid: user.uid,
            name: user?.fullName || '',
            department: user?.department || '',
            batch: user?.batch || user?.admissionYear || '',
            optedIn: true,
            optedInAt: serverTimestamp(),
            autoDeactivateAt,
        });
        await logAction(canonicalId, 'OPT_IN', { uid: user.uid });
    }, [user]);

    // ── Opt-out ───────────────────────────────────────────────────────────────
    const optOut = useCallback(async () => {
        const canonicalId = (user?.rollNumber || user?.registerNumber || user?.uid).toString().trim();
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
    const validateReceiver = useCallback(async (input) => {
        const receiverRegNo = (input || '').toString().trim();
        if (!receiverRegNo) return { valid: false, reason: 'Please enter a register number.' };

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
                uid: studentData.uid || null,
                name: student.fullName,
                department: student.department,
                batch: student.admissionYear
            }
        };
    }, [checkRateLimit]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (receiver, messageText) => {
        const receiverRegNo = receiver.regNo;
        const receiverUid = receiver.uid;

        if (!myRegNo) throw new Error('Not logged in');

        // Message count check
        if (sentMessages.length >= MAX_MESSAGES_PER_SENDER) {
            return { success: false, reason: `Message limit reached (${MAX_MESSAGES_PER_SENDER}/${MAX_MESSAGES_PER_SENDER}). No more messages allowed.` };
        }

        // Duplicate check
        const alreadySent = sentMessages.some(m => m.receiverRegNo === receiverRegNo || (receiverUid && m.receiverUid === receiverUid));
        if (alreadySent) {
            return { success: false, reason: 'You have already sent a message to this student.' };
        }

        // Can't message yourself
        if (receiverRegNo === myRegNo || (receiverUid && receiverUid === user?.uid)) {
            return { success: false, reason: 'You cannot send a message to yourself.' };
        }

        // Bad-word filter
        const { isClean, flaggedWords, sanitized } = filterMessage(messageText);
        const releaseAt = new Date('2026-03-08T03:30:00Z'); // 9AM IST

        const msgData = {
            senderRegNo: myRegNo,
            senderName: user?.fullName || 'Anonymous',
            receiverRegNo,
            receiverUid,
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
        // Optimization: Limit to latest 100 messages to reduce read costs
        const q = query(collection(db, 'wdMessages'), orderBy('timestamp', 'desc'), limit(100));
        const unsub = onSnapshot(q, snap => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        // Optimization: Filter for optedIn only to reduce reads
        const q = query(collection(db, 'wdParticipants'), where('optedIn', '==', true));
        const unsub = onSnapshot(q, snap => {
            setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, []);

    // Logs are expensive to watch in real-time. Switching to one-time fetch with limit.
    const fetchLogs = useCallback(async () => {
        const q = query(collection(db, 'wdLogs'), orderBy('timestamp', 'desc'), limit(50));
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

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

    const resetToPending = useCallback(async (msgId) => {
        await updateDoc(doc(db, 'wdMessages', msgId), {
            status: 'pending',
            adminNote: 'Reset by admin',
            resetAt: serverTimestamp(),
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
        approveMessage, rejectMessage, resetToPending, toggleManualRelease,
        refreshLogs: fetchLogs,
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
