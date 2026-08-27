import { getRandomLeetCodeChallenge } from "./leetcodeScraper.js";
import { generate10Testcases } from "./testcaseGenerator.js";

/**
 * Triggers a live LeetCode challenge immediately with status 'active'
 * without disturbing the Saturday-Sunday scheduler.
 */
export async function triggerLiveChallenge(difficulty = "EASY") {
    console.log(`\n⏳ Fetching live ${difficulty} problem from LeetCode GraphQL API...`);
    const problem = await getRandomLeetCodeChallenge(difficulty);

    if (!problem) {
        console.error("❌ Failed to fetch problem from LeetCode.");
        return null;
    }

    const title = problem.title || "Live Coding Challenge";
    const rawContent = problem.content || "";
    const rawTestcases = problem.exampleTestcases || "";

    const { testcases, cleanedDesc } = generate10Testcases(title, rawContent, rawTestcases);

    const liveChallengePayload = {
        title: `[LeetCode LIVE] ${title}`,
        problemStatement: cleanedDesc,
        difficulty: difficulty.toUpperCase(),
        xpPoints: difficulty.toUpperCase() === "MEDIUM" ? 500 : 200,
        timeLimit: difficulty.toUpperCase() === "MEDIUM" ? 45 : 30,
        sampleInput: testcases[0]?.input || "",
        sampleOutput: testcases[0]?.output || "",
        testCases: testcases,
        testCasesCount: testcases.length,
        allowedLanguages: "Python, JavaScript, C++, Java",
        status: "active", // Live immediately!
        mode: "instant_test",
        createdAt: new Date().toISOString()
    };

    console.log(`\n✅ LIVE CHALLENGE READY: "${liveChallengePayload.title}"`);
    console.log(`📊 Difficulty: ${liveChallengePayload.difficulty} | XP: ${liveChallengePayload.xpPoints} | TestCases: ${liveChallengePayload.testCasesCount}`);
    return liveChallengePayload;
}

// Execute if run directly
if (process.argv[1].endsWith('triggerLiveChallenge.js')) {
    (async () => {
        const payload = await triggerLiveChallenge("EASY");
        console.log("\n=== LIVE CHALLENGE PAYLOAD ===");
        console.log(JSON.stringify(payload, null, 2));
    })();
}
