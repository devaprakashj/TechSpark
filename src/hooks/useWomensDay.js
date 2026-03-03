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

    const myRegNo = user?.rollNo || user?.uid;

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
        const ref = doc(db, 'wdParticipants', myRegNo);
        const unsub = onSnapshot(ref, snap => {
            setParticipation(snap.exists() ? snap.data() : null);
            setLoadingPart(false);
        });
        return unsub;
    }, [myRegNo]);

    // ── Real-time: messages I received (only released approved) ──────────────
    useEffect(() => {
        if (!myRegNo) return;
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
        if (!myRegNo) throw new Error('Not logged in');
        if (user?.gender !== 'Female') {
            throw new Error('Women\'s Day participation is currently limited to female students only.');
        }
        const autoDeactivate = new Date('2026-03-09T00:00:00+05:30');
        await setDoc(doc(db, 'wdParticipants', myRegNo), {
            rollNo: myRegNo,
            name: user?.fullName || '',
            department: user?.department || '',
            batch: user?.batch || user?.admissionYear || '',
            optedIn: true,
            optedInAt: serverTimestamp(),
            autoDeactivateAt: autoDeactivate,
        });
        await logAction(myRegNo, 'OPT_IN', {});
    }, [myRegNo, user]);

    // ── Opt-out ───────────────────────────────────────────────────────────────
    const optOut = useCallback(async () => {
        if (!myRegNo) throw new Error('Not logged in');
        await updateDoc(doc(db, 'wdParticipants', myRegNo), { optedIn: false });
        await logAction(myRegNo, 'OPT_OUT', {});
    }, [myRegNo]);

    // ── Check rate limit ──────────────────────────────────────────────────────
    const checkRateLimit = useCallback(async () => {
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

        // check in users collection
        const q = query(collection(db, 'users'), where('rollNo', '==', receiverRegNo));
        const snap = await getDocs(q);
        if (snap.empty) return { valid: false, reason: 'Student not found in database.' };

        const studentDoc = snap.docs[0];
        const student = studentDoc.data();

        if (student.gender !== 'Female') {
            return { valid: false, reason: 'This feature is for sending messages to female students for Women\'s Day.' };
        }

        // check participant opt-in
        const partSnap = await getDoc(doc(db, 'wdParticipants', receiverRegNo));
        if (!partSnap.exists() || !partSnap.data().optedIn) {
            return { valid: false, reason: 'This student is not participating in Women\'s Day event.' };
        }

        // Auto-deactivate check
        const deactivateAt = partSnap.data().autoDeactivateAt?.toDate?.();
        if (deactivateAt && new Date() > deactivateAt) {
            return { valid: false, reason: 'Women\'s Day event has ended.' };
        }

        return {
            valid: true,
            receiver: {
                regNo: receiverRegNo,
                name: student.fullName || '',
                department: student.department || '',
                batch: student.admissionYear || student.batch || '',
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
