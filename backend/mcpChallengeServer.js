import http from 'http';
import url from 'url';
import { getRandomLeetCodeChallenge } from './leetcodeScraper.js';
import { generate10Testcases, cleanHtml } from './testcaseGenerator.js';
import { buildWeeklyChallengePayload } from './automateChallenge.js';

const PORT = 8008;

const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    res.setHeader('Content-Type', 'application/json');

    try {
        if (pathname === '/' || pathname === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: "online",
                service: "TechSpark Node.js MCP Challenge Automation Server",
                schedule: "Saturday 00:00 - Sunday 24:00",
                techstack: "Node.js + React",
                endpoints: [
                    "/mcp/fetch-leetcode-problem",
                    "/mcp/generate-testcases",
                    "/mcp/create-weekly-challenge"
                ]
            }));
            return;
        }

        if (pathname === '/mcp/fetch-leetcode-problem' && req.method === 'GET') {
            const difficulty = (query.difficulty || 'EASY').toUpperCase();
            const problem = await getRandomLeetCodeChallenge(difficulty);
            if (!problem) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: "Failed to fetch problem from LeetCode" }));
                return;
            }

            const cleanDesc = cleanHtml(problem.content || "");
            res.writeHead(200);
            res.end(JSON.stringify({
                title: problem.title,
                titleSlug: problem.titleSlug,
                difficulty: problem.difficulty,
                problemStatement: cleanDesc,
                exampleTestcases: problem.exampleTestcases,
                topicTags: (problem.topicTags || []).map(t => t.name)
            }));
            return;
        }

        if (pathname === '/mcp/generate-testcases' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                const data = JSON.parse(body || '{}');
                const { testcases } = generate10Testcases(
                    data.problem_title || 'Coding Challenge',
                    data.problem_content || '',
                    data.example_testcases || ''
                );
                res.writeHead(200);
                res.end(JSON.stringify({
                    title: data.problem_title,
                    totalTestCases: testcases.length,
                    testCases: testcases
                }));
            });
            return;
        }

        if (pathname === '/mcp/trigger-live-challenge' && req.method === 'GET') {
            const difficulty = (query.difficulty || 'EASY').toUpperCase();
            const { triggerLiveChallenge } = await import('./triggerLiveChallenge.js');
            const payload = await triggerLiveChallenge(difficulty);
            if (!payload) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: "Failed to trigger live challenge" }));
                return;
            }

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                message: "Live LeetCode challenge triggered instantly with status 'active'!",
                challenge: payload
            }));
            return;
        }

        if (pathname === '/mcp/create-weekly-challenge' && req.method === 'GET') {
            const difficulty = (query.difficulty || 'EASY').toUpperCase();
            const payload = await buildWeeklyChallengePayload(difficulty);
            if (!payload) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: "Failed to build weekly challenge payload" }));
                return;
            }

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                message: "Weekly coding challenge generated in Node.js for Saturday 00:00 to Sunday 24:00",
                challenge: payload
            }));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: "Endpoint not found" }));

    } catch (err) {
        console.error("Server error:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Node.js MCP Challenge Server running at http://localhost:${PORT}`);
});
