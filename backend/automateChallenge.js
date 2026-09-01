import { getRandomLeetCodeChallenge } from "./leetcodeScraper.js";
import { generate10Testcases } from "./testcaseGenerator.js";

/**
 * Builds weekly coding challenge payload scheduled Saturday 00:00 (IST) to Sunday 23:59:59 (IST).
 */
export async function buildWeeklyChallengePayload(difficulty = "EASY") {
    const problem = await getRandomLeetCodeChallenge(difficulty);
    if (!problem) {
        console.error("Failed to fetch problem from LeetCode.");
        return null;
    }

    const title = problem.title || "Weekly Coding Challenge";
    const rawContent = problem.content || "";
    const rawTestcases = problem.exampleTestcases || "";

    const { testcases, cleanedDesc } = generate10Testcases(title, rawContent, rawTestcases);

    // Compute Saturday 00:00 IST and Sunday 23:59:59 IST in Asia/Kolkata timezone
    const now = new Date();
    const istDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istNow = new Date(istDateStr);

    const dayOfWeek = istNow.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const isWeekend = (dayOfWeek === 6 || dayOfWeek === 0);

    let satDate, sunDate;
    if (dayOfWeek === 6) {
        satDate = new Date(istNow);
        satDate.setHours(0, 0, 0, 0);
        sunDate = new Date(istNow);
        sunDate.setDate(istNow.getDate() + 1);
        sunDate.setHours(23, 59, 59, 999);
    } else if (dayOfWeek === 0) {
        satDate = new Date(istNow);
        satDate.setDate(istNow.getDate() - 1);
        satDate.setHours(0, 0, 0, 0);
        sunDate = new Date(istNow);
        sunDate.setHours(23, 59, 59, 999);
    } else {
        const daysUntilSaturday = 6 - dayOfWeek;
        satDate = new Date(istNow);
        satDate.setDate(istNow.getDate() + daysUntilSaturday);
        satDate.setHours(0, 0, 0, 0);
        sunDate = new Date(satDate);
        sunDate.setDate(satDate.getDate() + 1);
        sunDate.setHours(23, 59, 59, 999);
    }

    const pad = (n) => String(n).padStart(2, '0');
    const formatISTIso = (d) => {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+05:30`;
    };

    const scheduledStartTime = formatISTIso(satDate);
    const scheduledEndTime = formatISTIso(sunDate);

    const sampleInput = testcases[0]?.input || "";
    const sampleOutput = testcases[0]?.output || "";

    return {
        title: `[LeetCode] ${title}`,
        problemStatement: cleanedDesc,
        difficulty: difficulty.toUpperCase(),
        xpPoints: difficulty.toUpperCase() === "MEDIUM" ? 500 : 200,
        timeLimit: difficulty.toUpperCase() === "MEDIUM" ? 45 : 30,
        sampleInput,
        sampleOutput,
        codeSnippets: problem.codeSnippets || [],
        testCases: testcases,
        testCasesCount: testcases.length,
        allowedLanguages: "Python, JavaScript, C++, Java",
        status: isWeekend ? "active" : "scheduled",
        scheduleWindow: "Saturday 00:00 (IST) - Sunday 23:59 (IST)",
        scheduledStartTime: scheduledStartTime,
        scheduledEndTime: scheduledEndTime,
        timezone: "Asia/Kolkata",
        createdAt: new Date().toISOString()
    };
}

// Execute if run directly via node
if (process.argv[1] && process.argv[1].endsWith('automateChallenge.js')) {
    (async () => {
        console.log("Generating Node.js Weekly Challenge Payload...");
        const payload = await buildWeeklyChallengePayload("EASY");
        if (payload) {
            console.log("\n=== GENERATED WEEKLY CHALLENGE PAYLOAD (Node.js) ===");
            console.log(JSON.stringify(payload, null, 2));
        }
    })();
}
