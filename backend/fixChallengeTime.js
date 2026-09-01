import { db, collection, getDocs, updateDoc, doc } from "./firebaseBackend.js";

async function fixChallenge(mode = "live") {
    const snap = await getDocs(collection(db, "ts_challenges"));
    
    // Find the latest scheduled or active challenge
    const challenges = snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
    const scheduled = challenges.filter(c => c.status === "scheduled" || c.status === "active");

    if (scheduled.length === 0) {
        console.log("No scheduled or active challenges found in Firestore.");
        process.exit(0);
    }

    // Sort newest first
    scheduled.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const target = scheduled[0];

    console.log(`Found challenge: "${target.title}" (ID: ${target.id})`);
    console.log(`Current status: ${target.status}`);
    console.log(`Current scheduledStartTime: ${target.scheduledStartTime}`);

    if (mode === "live") {
        await updateDoc(doc(db, "ts_challenges", target.id), {
            status: "active",
            activatedAt: new Date().toISOString()
        });
        console.log(`\n✅ Challenge is now LIVE immediately! Status set to 'active'.`);
        console.log(`Students can now click 'Enter' on their dashboard.`);
    } else if (mode === "saturday") {
        // Set exact Saturday 00:00 IST
        const now = new Date();
        const istStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const istNow = new Date(istStr);
        const dayOfWeek = istNow.getDay();
        const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
        
        const sat = new Date(istNow);
        sat.setDate(istNow.getDate() + (6 - dayOfWeek));
        sat.setHours(0, 0, 0, 0);

        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        sun.setHours(23, 59, 59, 999);

        const pad = (n) => String(n).padStart(2, '0');
        const satIso = `${sat.getFullYear()}-${pad(sat.getMonth() + 1)}-${pad(sat.getDate())}T00:00:00+05:30`;
        const sunIso = `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}T23:59:59+05:30`;

        await updateDoc(doc(db, "ts_challenges", target.id), {
            status: "scheduled",
            scheduledStartTime: satIso,
            scheduledEndTime: sunIso,
            scheduleWindow: "Saturday 00:00 (IST) - Sunday 24:00 (IST)"
        });
        console.log(`\n✅ Challenge schedule updated to Saturday 00:00 IST!`);
        console.log(`New scheduledStartTime: ${satIso}`);
    }

    process.exit(0);
}

const mode = process.argv[2] || "live";
fixChallenge(mode);
