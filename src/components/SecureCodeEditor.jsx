import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Maximize, Play, Save, AlertOctagon, Terminal, User, Hash, GraduationCap, Calendar, Clock, CheckCircle2, XCircle, Lock, Code2, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

/**
 * Gets the LeetCode code snippet for the given language.
 * Falls back to a clean generic template if not found.
 */
const getDefaultCodeSnippet = (lang, challenge) => {
    if (challenge?.codeSnippets && Array.isArray(challenge.codeSnippets)) {
        const langMap = {
            python: ['python3', 'python'],
            javascript: ['javascript', 'js'],
            cpp: ['cpp', 'c++'],
            java: ['java']
        };
        const targets = langMap[lang] || [lang];
        const found = challenge.codeSnippets.find(s => targets.includes((s.langSlug || s.lang || '').toLowerCase()));
        if (found && found.code) {
            let snippet = found.code;
            if (lang === 'python') {
                const trimmed = snippet.trimEnd();
                if (trimmed.endsWith(':')) {
                    snippet = trimmed + '\n        # Write your solution here\n        pass\n';
                }
            }
            return snippet;
        }
    }

    // Fallback generic templates
    switch (lang) {
        case 'python':
            return `class Solution:\n    def solve(self, nums: List[int], target: int) -> int:\n        # Write your solution here\n        pass\n`;
        case 'javascript':
            return `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar solve = function(nums, target) {\n    // Write your solution here\n};\n`;
        case 'cpp':
            return `class Solution {\npublic:\n    int solve(vector<int>& nums, int target) {\n        // Write your solution here\n        return 0;\n    }\n};\n`;
        case 'java':
            return `class Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}\n`;
        default:
            return `// Write your solution here\n`;
    }
};

/**
 * Extracts the method name from a LeetCode-style code snippet.
 * Looks for the first public method in the class body.
 */
const extractMethodInfo = (code, lang) => {
    let methodName = null;
    let paramCount = 0;

    if (lang === 'python') {
        const codeWithoutComments = code.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
        const matches = [...codeWithoutComments.matchAll(/def\s+([a-zA-Z0-9_]+)\s*\(self(?:,\s*([^)]+))?\)/g)];
        const validMatch = matches.find(m => m[1] !== '__init__' && !m[1].startsWith('_'));
        if (validMatch) {
            methodName = validMatch[1];
            const params = validMatch[2] ? validMatch[2].split(',').filter(p => p.trim()) : [];
            paramCount = params.length;
        }
    } else if (lang === 'javascript') {
        const codeWithoutComments = code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
        const m1 = codeWithoutComments.match(/var\s+([a-zA-Z0-9_]+)\s*=\s*function\s*\(([^)]*)\)/);
        const m2 = codeWithoutComments.match(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
        const match = m1 || m2;
        if (match) {
            methodName = match[1];
            const params = match[2] ? match[2].split(',').filter(p => p.trim()) : [];
            paramCount = params.length;
        }
    } else if (lang === 'cpp') {
        const codeWithoutComments = code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
        const match = codeWithoutComments.match(/public:[\s\S]*?\w[\w<>*&, ]+\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
        if (match) {
            methodName = match[1];
            const params = match[2] ? match[2].split(',').filter(p => p.trim()) : [];
            paramCount = params.length;
        }
    } else if (lang === 'java') {
        const codeWithoutComments = code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
        const match = codeWithoutComments.match(/public\s+[\w<>\[\]]+\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
        if (match) {
            methodName = match[1];
            const params = match[2] ? match[2].split(',').filter(p => p.trim()) : [];
            paramCount = params.length;
        }
    }

    return { methodName, paramCount };
};

/**
 * Wraps user's LeetCode-style code with a driver that:
 * 1. Reads each line of stdin as a JSON argument
 * 2. Calls the Solution method with those args
 * 3. Prints the result as JSON
 * This matches LeetCode's actual execution model.
 */
const wrapSourceCode = (code, lang) => {
    const { methodName, paramCount } = extractMethodInfo(code, lang);

    if (lang === 'python') {
        if (code.includes('class Solution') && !code.includes('sys.stdin') && !code.includes('input(')) {
            const detectedMethod = methodName || '';
            const preamble = `import sys
import json
from typing import Optional, List, Tuple, Set, Dict

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __repr__(self):
        result, node = [], self
        while node:
            result.append(node.val)
            node = node.next
        return str(result)

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _list_to_linkedlist(lst):
    if not lst: return None
    head = ListNode(lst[0])
    cur = head
    for v in lst[1:]:
        cur.next = ListNode(v)
        cur = cur.next
    return head

def _linkedlist_to_list(node):
    result = []
    while node:
        result.append(node.val)
        node = node.next
    return result

def _parse_arg(s):
    s = s.strip()
    try:
        return json.loads(s)
    except Exception:
        return s

`;

            const driverCode = `

if __name__ == '__main__':
    try:
        raw = sys.stdin.read()
        lines = [l for l in raw.split('\\n') if l.strip()]
        sol = Solution()
        import inspect
        methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]
        method_name = '${detectedMethod}' if '${detectedMethod}' else (methods[0] if methods else None)
        if method_name and hasattr(sol, method_name):
            method = getattr(sol, method_name)
            sig = inspect.signature(method)
            param_count = len(sig.parameters)
            parsed = [_parse_arg(l) for l in lines[:max(param_count, 1)]]
            type_hints = str(sig)
            converted = []
            for arg in parsed:
                if isinstance(arg, list) and 'ListNode' in type_hints:
                    converted.append(_list_to_linkedlist(arg))
                else:
                    converted.append(arg)
            if param_count == 0:
                result = method()
            elif param_count == 1:
                result = method(converted[0] if converted else None)
            else:
                result = method(*converted[:param_count])
            if result is not None:
                if hasattr(result, 'val') or type(result).__name__ == 'ListNode' or isinstance(result, ListNode):
                    result = _linkedlist_to_list(result)
                if isinstance(result, (list, dict)):
                    print(json.dumps(result, separators=(',', ':')))
                elif isinstance(result, bool):
                    print('true' if result else 'false')
                else:
                    print(result)
            else:
                if 'ListNode' in type_hints:
                    print('[]')
                else:
                    print('null')
    except Exception as e:
        sys.stderr.write('Error: ' + str(e) + '\\n')
`;
            return preamble + code + driverCode;
        }
    } else if (lang === 'javascript') {
        if ((code.includes('var ') || code.includes('function ') || code.includes('class Solution')) && !code.includes('require(') && !code.includes('readFileSync')) {
            const fnName = methodName || 'solve';
            const driverCode = `

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', (line) => lines.push(line.trim()));
rl.on('close', () => {
    try {
        function parseArg(s) {
            try { return JSON.parse(s); } catch(e) { return s; }
        }
        const parsed = lines.filter(Boolean).map(parseArg);
        let sol = typeof Solution !== 'undefined' ? new Solution() : null;
        let fn = sol && typeof sol['${fnName}'] === 'function' ? sol['${fnName}'].bind(sol) : (typeof ${fnName} === 'function' ? ${fnName} : null);
        if (!fn && sol) {
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(sol)).filter(m => m !== 'constructor');
            if (methods.length > 0) fn = sol[methods[0]].bind(sol);
        }
        if (!fn) throw new Error('Function not found');
        const result = parsed.length === 1 ? fn(parsed[0]) : fn(...parsed);
        if (result !== undefined) {
            console.log(typeof result === 'object' ? JSON.stringify(result) : result);
        }
    } catch(e) {
        process.stderr.write('Error: ' + e.message + '\\n');
    }
});
`;
            return code + driverCode;
        }
    } else if (lang === 'java') {
        if (code.includes('class Solution') && !code.includes('public static void main')) {
            const preamble = `import java.util.*;
import java.io.*;
import java.lang.reflect.*;

`;
            const javaDriver = `

public class Main {
    public static void main(String[] args) {
        try {
            Scanner sc = new Scanner(System.in);
            StringBuilder sb = new StringBuilder();
            while (sc.hasNextLine()) {
                sb.append(sc.nextLine()).append("\\n");
            }
            String raw = sb.toString().trim();

            Solution sol = new Solution();
            Method[] methods = Solution.class.getDeclaredMethods();
            Method target = null;
            for (Method m : methods) {
                if (!m.getName().contains("$") && Modifier.isPublic(m.getModifiers())) {
                    target = m;
                    break;
                }
            }
            if (target == null && methods.length > 0) {
                target = methods[0];
            }
            if (target != null) {
                target.setAccessible(true);
                Class<?>[] paramTypes = target.getParameterTypes();
                String[] lines = raw.isEmpty() ? new String[0] : raw.split("\\n");
                Object[] argsList = new Object[paramTypes.length];

                for (int i = 0; i < paramTypes.length; i++) {
                    String line = i < lines.length ? lines[i].trim() : "";
                    argsList[i] = parseArg(line, paramTypes[i]);
                }

                Object result = target.invoke(sol, argsList);
                if (result != null) {
                    if (result instanceof int[]) {
                        System.out.println(Arrays.toString((int[]) result).replace(" ", ""));
                    } else if (result instanceof boolean[]) {
                        System.out.println(Arrays.toString((boolean[]) result).replace(" ", ""));
                    } else if (result instanceof Object[]) {
                        System.out.println(Arrays.deepToString((Object[]) result).replace(" ", ""));
                    } else if (result instanceof List) {
                        System.out.println(result.toString().replace(" ", ""));
                    } else {
                        System.out.println(result);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static Object parseArg(String s, Class<?> type) {
        s = s.trim();
        if (type == int[].class) {
            s = s.replace("[", "").replace("]", "").replace(" ", "");
            if (s.isEmpty()) return new int[0];
            String[] parts = s.split(",");
            int[] arr = new int[parts.length];
            for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
            return arr;
        } else if (type == String[].class) {
            s = s.replace("[", "").replace("]", "").replace(String.valueOf('"'), "").replace(" ", "");
            if (s.isEmpty()) return new String[0];
            return s.split(",");
        } else if (type == int.class || type == Integer.class) {
            return Integer.parseInt(s);
        } else if (type == boolean.class || type == Boolean.class) {
            return Boolean.parseBoolean(s.toLowerCase());
        } else if (type == double.class || type == Double.class) {
            return Double.parseDouble(s);
        } else if (type == long.class || type == Long.class) {
            return Long.parseLong(s);
        } else if (type == String.class) {
            return s.replace(String.valueOf('"'), "");
        }
        return s;
    }
}
`;
            return preamble + code + javaDriver;
        }
    } else if (lang === 'cpp') {
        if (code.includes('class Solution') && !code.includes('int main(')) {
            const preamble = `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
using namespace std;

`;
            return preamble + code;
        }
    }

    return code;
};

const SecureCodeEditor = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const challenge = location.state?.challenge || null;
    const { user } = useAuth();
    
    const studentUser = user || { uid: 'test_uid', fullName: 'Test Student', rollNumber: '000000', department: 'TEST' };

    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState(() => getDefaultCodeSnippet('python', challenge));
    const [output, setOutput] = useState('');
    const [testResults, setTestResults] = useState([]);
    const [activeTerminalTab, setActiveTerminalTab] = useState('testcases'); // 'testcases' or 'console'
    const [isRunning, setIsRunning] = useState(false);
    const [isOutputMatched, setIsOutputMatched] = useState(false);
    
    // Security States
    const [warnings, setWarnings] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [hasStarted, setHasStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState((challenge?.timeLimit || 30) * 60);
    const [customAlert, setCustomAlert] = useState(null);
    
    const containerRef = useRef(null);
    const hasStartedRef = useRef(false);
    const isSubmittingRef = useRef(false);
    const lastWarningTimeRef = useRef(0);
    const warningsRef = useRef(0);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);

    // Update default code when language changes
    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        setCode(getDefaultCodeSnippet(newLang, challenge));
    };

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setCameraActive(true);
                }
            } catch (err) {
                console.error("Camera access error:", err);
            }
        };
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        warningsRef.current = warnings;
    }, [warnings]);

    useEffect(() => {
        if (hasStarted && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [hasStarted]);

    useEffect(() => {
        if (!hasStarted) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!isSubmittingRef.current) {
                        isSubmittingRef.current = true;
                        handleAutoSubmit(warningsRef.current, "Time is up!");
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [hasStarted]);

    useEffect(() => {
        if (!challenge) {
            navigate('/');
            return;
        }

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
                if (hasStartedRef.current) {
                    triggerWarning("You exited fullscreen mode!");
                }
            } else {
                setIsFullscreen(true);
                setHasStarted(true);
                hasStartedRef.current = true;
            }
        };

        const forceExit = () => {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                if (hasStartedRef.current) {
                    triggerWarning("You switched to another tab or minimized the window!");
                    forceExit();
                }
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
            }
            if (e.key === 'PrintScreen' || (e.shiftKey && e.metaKey && e.key.toLowerCase() === 's')) {
                e.preventDefault();
                navigator.clipboard.writeText('');
                if (hasStartedRef.current) {
                    triggerWarning("Screenshots are disabled during the test!");
                }
            }
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'C' || e.key === 'V' || e.key === 'X')) {
                e.preventDefault();
            }
        };

        const handleContextMenu = (e) => e.preventDefault();
        const handleCopyPaste = (e) => e.preventDefault();

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyDown);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
        };
    }, []);

    const triggerWarning = (reason) => {
        if (isSubmittingRef.current) return;
        
        const now = Date.now();
        if (now - lastWarningTimeRef.current < 1000) return;
        lastWarningTimeRef.current = now;

        setWarnings(prev => {
            const newWarnings = prev + 1;
            
            if (newWarnings >= 3) {
                isSubmittingRef.current = true;
                setCustomAlert({
                    message: `⚠️ WARNING ${newWarnings}/3: ${reason}\n\nYou have reached the maximum number of warnings. Your test is being auto-submitted.`,
                    isFinal: true
                });
                handleAutoSubmit(newWarnings, "Max warnings reached");
            } else {
                setCustomAlert({
                    message: `⚠️ WARNING ${newWarnings}/3: ${reason}\n\nContinuing this behavior will result in automatic disqualification.`,
                    isFinal: false
                });
            }
            return newWarnings;
        });
    };

    const handleAutoSubmit = async (finalWarnings, reason = null) => {
        if (!isSubmittingRef.current) {
            isSubmittingRef.current = true;
        }
        setCustomAlert({
            message: `🚨 ${reason || "Max warnings reached."} Your test is being auto-submitted...`,
            isFinal: true
        });
        await submitAssessment(finalWarnings);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const JUDGE0_API_URL = "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";

    const getJudge0Language = (lang) => {
        switch (lang) {
            case 'python': return 100;
            case 'javascript': return 102;
            case 'java': return 91;
            case 'cpp': return 105;
            default: return 100;
        }
    };

    const runCode = async () => {
        setIsRunning(true);
        setOutput("Compiling and evaluating against 10 test cases...");
        setTestResults([]);
        
        try {
            const langId = getJudge0Language(language);
            const testCases = challenge?.testCases && challenge.testCases.length > 0 ? challenge.testCases : [
                { id: 1, input: challenge?.sampleInput || "", output: challenge?.sampleOutput || "", isHidden: false }
            ];

            const wrappedCode = wrapSourceCode(code, language);
            let passedCount = 0;
            let resultsList = [];
            let logSummary = "";

            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                const response = await fetch(JUDGE0_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        language_id: langId,
                        source_code: wrappedCode,
                        stdin: tc.input || ""
                    })
                });

                const data = await response.json();
                if (data.status?.id === 3) {
                    const actualOutput = (data.stdout || "").trim();
                    const expectedOutput = (tc.output || "").trim();
                    
                    const normalize = (str) => {
                        if (!str) return "";
                        return str.trim()
                            .replace(/\r\n/g, '\n')
                            .replace(/\s*,\s*/g, ',')
                            .replace(/\s+/g, ' ')
                            .toLowerCase();
                    };
                    const passed = normalize(actualOutput) === normalize(expectedOutput);

                    if (passed) passedCount++;

                    resultsList.push({
                        id: i + 1,
                        input: tc.input,
                        expected: expectedOutput,
                        actual: actualOutput,
                        passed,
                        isHidden: tc.isHidden || i >= 2,
                        description: tc.description || `Test Case ${i + 1}`
                    });

                    logSummary += `[TestCase ${i + 1}${tc.isHidden ? " (Hidden)" : ""}] ${passed ? "✅ PASSED" : "❌ FAILED"}\n`;
                    if (!tc.isHidden) {
                        logSummary += `   Input: ${tc.input}\n   Expected: ${expectedOutput}\n   Actual: ${actualOutput}\n`;
                    }
                } else {
                    const errText = data.compile_output || data.stderr || data.status?.description || "Compilation Error";
                    resultsList.push({
                        id: i + 1,
                        input: tc.input,
                        expected: tc.output,
                        actual: errText,
                        passed: false,
                        error: true,
                        isHidden: tc.isHidden || i >= 2,
                        description: tc.description || `Test Case ${i + 1}`
                    });
                    logSummary += `[TestCase ${i + 1}] ❌ ERROR: ${errText}\n`;
                }
            }

            const allPassed = passedCount === testCases.length;
            setIsOutputMatched(allPassed);
            setTestResults(resultsList);
            setOutput(`=== TEST RUN SUMMARY (${passedCount}/${testCases.length} Passed) ===\n\n${logSummary}`);
            setActiveTerminalTab('testcases');

            if (allPassed) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            }
        } catch (error) {
            console.error("Execution error:", error);
            setOutput("Network error connecting to compiler engine.");
        }
        setIsRunning(false);
    };

    const submitAssessment = async (finalWarnings = warnings) => {
        try {
            const timeLimitInSeconds = (challenge?.timeLimit || 30) * 60;
            const timeTakenSeconds = timeLimitInSeconds - timeLeft;
            const timeTakenFormatted = formatTime(timeTakenSeconds);

            await addDoc(collection(db, 'ts_challenge_submissions'), {
                challengeId: challenge.id,
                studentUid: studentUser.uid || studentUser.id,
                studentName: studentUser.fullName,
                studentRoll: studentUser.rollNumber,
                studentDepartment: studentUser.department || '',
                studentYear: studentUser.yearOfStudy || '',
                studentSection: studentUser.section || '',
                code: code,
                output: output,
                language: language,
                warnings: finalWarnings,
                timeTaken: timeTakenSeconds,
                timeTakenFormatted: timeTakenFormatted,
                isOutputMatched: isOutputMatched,
                status: (isOutputMatched && finalWarnings < 3) ? 'verified' : 'pending',
                submittedAt: serverTimestamp()
            });
            
            alert("✅ Assessment submitted successfully!");
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
            navigate('/dashboard');
        } catch (error) {
            console.error("Submission error:", error);
            alert("Failed to submit assessment.");
        }
    };

    if (!challenge) return null;

    if (!isFullscreen) {
        return (
            <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-center p-6 text-white font-sans">
                {hasStarted ? (
                    <>
                        <AlertOctagon className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
                        <h1 className="text-3xl font-black uppercase tracking-widest mb-4">Fullscreen Required</h1>
                        <p className="text-slate-400 font-medium mb-8 max-w-lg">
                            You have exited fullscreen mode. The coding environment is locked to prevent malpractices. 
                            Please return to fullscreen to continue your assessment.
                        </p>
                    </>
                ) : (
                    <>
                        <Maximize className="w-20 h-20 text-blue-500 mb-6" />
                        <h1 className="text-3xl font-black uppercase tracking-widest mb-4">Ready to Begin</h1>
                        <p className="text-slate-400 font-medium mb-8 max-w-lg">
                            The secure environment requires fullscreen mode. Once you start, exiting fullscreen, 
                            copy-pasting, or switching tabs will result in a warning.
                        </p>
                    </>
                )}
                
                <button 
                    onClick={async () => {
                        try {
                            if (document.documentElement.requestFullscreen) {
                                await document.documentElement.requestFullscreen();
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }} 
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold uppercase tracking-wider transition-all shadow-xl shadow-blue-900/50"
                >
                    {hasStarted ? "Return to Fullscreen" : "Enter Fullscreen & Start"}
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="h-screen w-full bg-[#1e1e1e] flex flex-col font-sans select-none overflow-hidden" 
             onCopy={e => e.preventDefault()} 
             onPaste={e => e.preventDefault()} 
             onCut={e => e.preventDefault()}>
            
            {/* Top Navigation Header */}
            <header className="h-14 border-b border-slate-700 bg-slate-900 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <Code2 className="w-4 h-4 text-green-400" />
                    </div>
                    <h1 className="text-white font-black uppercase tracking-widest text-sm md:text-base">{challenge.title}</h1>
                    <span className={`px-3 py-1 rounded-md text-xs font-black flex items-center gap-1.5 shadow-inner ${timeLeft < 300 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        <Clock className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
                    </span>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-md text-xs font-black uppercase flex items-center gap-1.5 shadow-inner">
                        <AlertOctagon className="w-3.5 h-3.5" /> Warnings: {warnings}/3
                    </span>
                </div>
                
                {/* Student Profile Info */}
                <div className="flex items-center gap-4 lg:gap-6 hidden md:flex text-[9px] xl:text-xs uppercase tracking-wider text-slate-400 font-bold border-l border-slate-700 pl-4 ml-auto mr-4 lg:mr-6">
                    <div className="flex items-center gap-1.5" title="Student Name">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white">{studentUser.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Register Number">
                        <Hash className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white">{studentUser.rollNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Department">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white">{studentUser.department || 'N/A'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select 
                        value={language} 
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-lg border border-slate-700 outline-none cursor-pointer hover:border-slate-600 transition-colors"
                    >
                        <option value="python">Python 3</option>
                        <option value="javascript">JavaScript (Node.js)</option>
                        <option value="cpp">C++ (GCC)</option>
                        <option value="java">Java 17</option>
                    </select>

                    <button 
                        onClick={runCode}
                        disabled={isRunning}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg ${isRunning ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'}`}
                    >
                        <Play className="w-3.5 h-3.5" /> {isRunning ? 'Running...' : 'Run Code'}
                    </button>

                    {isOutputMatched && (
                        <button onClick={() => submitAssessment()} className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase rounded-lg shadow-lg shadow-green-900/50 flex items-center gap-1.5 transition-all animate-bounce">
                            <Save className="w-3.5 h-3.5" /> Submit Solution
                        </button>
                    )}
                </div>
            </header>

            {/* Main Editor Split Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Problem Description */}
                <div className="w-1/3 border-r border-slate-700 bg-slate-900/70 p-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${challenge.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                            {challenge.difficulty || 'EASY'}
                        </span>
                        <span className="text-slate-400 text-xs font-bold">🏆 {challenge.xpPoints || 200} XP</span>
                    </div>

                    <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4">{challenge.title}</h2>
                    
                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans mb-6">
                        {challenge.problemStatement}
                    </div>

                    {/* Sample Test Case Reference */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-blue-400" /> Example Case
                        </h3>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Input</span>
                            <pre className="p-3 bg-slate-950 rounded-lg text-slate-200 font-mono text-xs border border-slate-800">{challenge.sampleInput || 'N/A'}</pre>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Expected Output</span>
                            <pre className="p-3 bg-slate-950 rounded-lg text-green-400 font-mono text-xs border border-slate-800">{challenge.sampleOutput || 'N/A'}</pre>
                        </div>
                    </div>
                </div>

                {/* Live Webcam Proctor Feed */}
                {hasStarted && (
                    <div className="fixed bottom-4 right-4 w-32 h-24 bg-slate-900 border border-red-500/30 rounded-lg overflow-hidden shadow-2xl z-50 flex items-center justify-center group pointer-events-none">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1] opacity-80 group-hover:opacity-100 transition-opacity" />
                        {!cameraActive && <span className="text-[8px] text-red-500 font-bold uppercase text-center p-2 absolute animate-pulse">Camera Loading...</span>}
                        <div className="absolute top-1 right-1 flex items-center gap-1 bg-red-500/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-[6px] font-black text-red-500 uppercase tracking-widest">LIVE</span>
                        </div>
                    </div>
                )}

                {/* Right Panel: Editor & Split Testcase Output */}
                <div className="w-2/3 flex flex-col bg-[#1e1e1e]">
                    {/* Monaco Editor Container */}
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                contextmenu: false
                            }}
                        />
                    </div>
                    
                    {/* LeetCode Style Testcase Results Panel */}
                    <div className="h-72 border-t border-slate-700 bg-slate-950 flex flex-col shrink-0">
                        {/* Terminal Tab Header */}
                        <div className="h-10 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setActiveTerminalTab('testcases')}
                                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-t-lg flex items-center gap-1.5 transition-all ${activeTerminalTab === 'testcases' ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <Layers className="w-3.5 h-3.5" /> Test Cases ({testResults.length ? `${testResults.filter(r => r.passed).length}/${testResults.length}` : '10 Cases'})
                                </button>
                                <button 
                                    onClick={() => setActiveTerminalTab('console')}
                                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-t-lg flex items-center gap-1.5 transition-all ${activeTerminalTab === 'console' ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <Terminal className="w-3.5 h-3.5" /> Console Log
                                </button>
                            </div>

                            {testResults.length > 0 && (
                                <span className={`text-xs font-black uppercase px-3 py-1 rounded-md flex items-center gap-1 ${isOutputMatched ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    {isOutputMatched ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {isOutputMatched ? 'All 10 Test Cases Passed!' : `${testResults.filter(r => r.passed).length} / ${testResults.length} Passed`}
                                </span>
                            )}
                        </div>

                        {/* Terminal Body */}
                        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-xs">
                            {activeTerminalTab === 'testcases' ? (
                                testResults.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {testResults.map((tc) => (
                                            <div key={tc.id} className={`p-3 rounded-xl border transition-all ${tc.passed ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-red-950/20 border-red-800/40'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-black text-slate-300 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                                                        {tc.isHidden ? <Lock className="w-3 h-3 text-amber-400" /> : <Layers className="w-3 h-3 text-blue-400" />}
                                                        Case #{tc.id} {tc.isHidden ? '(Hidden)' : '(Sample)'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${tc.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {tc.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {tc.passed ? 'PASSED' : 'FAILED'}
                                                    </span>
                                                </div>

                                                {tc.isHidden ? (
                                                    <div className="text-[10px] text-slate-500 italic p-2 bg-slate-900/60 rounded border border-slate-800/50 flex items-center gap-1.5">
                                                        <Lock className="w-3 h-3 text-slate-500 shrink-0" /> Hidden test case — input and expected output locked to prevent hardcoding.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5 text-[10px]">
                                                        <div>
                                                            <span className="text-slate-500 font-bold uppercase">Input:</span>
                                                            <div className="text-slate-300 font-mono bg-slate-900/80 p-1.5 rounded border border-slate-800/80 truncate">{tc.input}</div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-slate-500 font-bold uppercase">Expected:</span>
                                                                <div className="text-emerald-400 font-mono bg-slate-900/80 p-1.5 rounded border border-slate-800/80 truncate">{tc.expected}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 font-bold uppercase">Actual:</span>
                                                                <div className={`font-mono p-1.5 rounded border border-slate-800/80 truncate ${tc.passed ? 'text-emerald-400 bg-slate-900/80' : 'text-red-400 bg-slate-900/80'}`}>{tc.actual || '(empty)'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                                        <Play className="w-8 h-8 opacity-40 animate-pulse text-blue-400" />
                                        <p className="text-xs font-bold uppercase tracking-wider">Click "Run Code" to compile & evaluate against all 10 test cases</p>
                                        <p className="text-[10px] text-slate-600 max-w-sm">Sample cases will display inputs/outputs. Hidden cases will evaluate strictly without revealing inputs.</p>
                                    </div>
                                )
                            ) : (
                                <div className="text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                                    {output || 'Console log output will appear here after execution...'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Fullscreen Alert Overlay */}
            {customAlert && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-950 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <AlertOctagon className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Security Alert</h3>
                        <p className="text-slate-400 font-medium whitespace-pre-wrap leading-relaxed mb-8">{customAlert.message}</p>
                        {!customAlert.isFinal ? (
                            <button 
                                onClick={() => setCustomAlert(null)}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-900/50"
                            >
                                I Understand
                            </button>
                        ) : (
                            <div className="w-full py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-xl flex justify-center">
                                <span className="animate-pulse">Submitting...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureCodeEditor;
