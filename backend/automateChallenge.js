import { getRandomLeetCodeChallenge } from "./leetcodeScraper.js";
import { generate10Testcases } from "./testcaseGenerator.js";

/**
 * Builds weekly coding challenge payload scheduled Saturday 00:00 to Sunday 24:00.
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

    // Compute upcoming Saturday 00:00 and Sunday 23:59:59
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    saturday.setHours(0, 0, 0, 0);

    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);

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
        status: "scheduled",
        scheduleWindow: "Saturday 00:00 - Sunday 24:00",
        scheduledStartTime: saturday.toISOString().replace('T', ' ').substring(0, 19),
        scheduledEndTime: sunday.toISOString().replace('T', ' ').substring(0, 19),
        createdAt: new Date().toISOString()
    };
}

// Execute if run directly via node
if (process.argv[1].endsWith('automateChallenge.js')) {
    (async () => {
        console.log("Generating Node.js Weekly Challenge Payload...");
        const payload = await buildWeeklyChallengePayload("EASY");
        if (payload) {
            console.log("\n=== GENERATED WEEKLY CHALLENGE PAYLOAD (Node.js) ===");
            console.log(JSON.stringify(payload, null, 2));
        }
    })();
}
