import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Maximize, Play, Save, AlertOctagon, Terminal, User, Hash, GraduationCap, Calendar, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

const SecureCodeEditor = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const challenge = location.state?.challenge || null;
    const { user } = useAuth();
    
    // Auth context used for student details
    const studentUser = user || { uid: 'test_uid', fullName: 'Test Student', rollNumber: '000000', department: 'TEST' };

    const [code, setCode] = useState('// Write your solution here\n');
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState('');
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

    useEffect(() => {
        warningsRef.current = warnings;
    }, [warnings]);

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

        // We remove ensureFullscreen on mount to avoid errors.
        // Fullscreen will be triggered by a direct user click.

        // 1. Fullscreen Change Detector
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
                // Only warn if they had already started the test
                if (hasStartedRef.current) {
                    triggerWarning("You exited fullscreen mode!");
                }
            } else {
                setIsFullscreen(true);
                setHasStarted(true);
                hasStartedRef.current = true;
            }
        };

        // 2. Visibility Change Detector (Tab switching)
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

        // 3. Block DevTools Shortcuts, PrintScreen & Copy/Paste
        const handleKeyDown = (e) => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
            }
            if (e.key === 'PrintScreen' || (e.shiftKey && e.metaKey && e.key.toLowerCase() === 's')) {
                e.preventDefault();
                navigator.clipboard.writeText(''); // clear clipboard
                if (hasStartedRef.current) {
                    triggerWarning("Screenshots are disabled during the test!");
                }
            }
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'C' || e.key === 'V' || e.key === 'X')) {
                e.preventDefault();
                // We just prevent it; no warning triggered for shortcuts
            }
        };

        const handleContextMenu = (e) => e.preventDefault();
        const handleCopyPaste = (e) => {
            e.preventDefault();
            // Just prevent the action; no warning triggered for UI copy/paste
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyDown); // PrintScreen often fires on keyup in Windows
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
        
        // Prevent multiple warnings triggering within 1 second of each other (fixes StrictMode & event bubbling issues)
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
            case 'python': return 100; // Python 3.12.5
            case 'javascript': return 102; // Node.js 22.08.0
            case 'java': return 91; // Java 17.0.6
            case 'cpp': return 105; // C++ GCC 14.1.0
            default: return 100;
        }
    };

    const runCode = async () => {
        setIsRunning(true);
        setOutput("Running...");
        
        try {
            const langId = getJudge0Language(language);
            const response = await fetch(JUDGE0_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language_id: langId,
                    source_code: code,
                    stdin: challenge?.sampleInput || ""
                })
            });
            
            const data = await response.json();
            if (data.status?.id === 3) {
                const actualOutput = data.stdout || "";
                setOutput(actualOutput || "Code executed successfully with no output.");
                
                // Compare ignoring trailing whitespace and newlines
                const expected = (challenge?.sampleOutput || "").trim();
                const actual = actualOutput.trim();
                
                if (expected === actual) {
                    setIsOutputMatched(true);
                    confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 }
                    });
                } else {
                    setIsOutputMatched(false);
                }
            } else if (data.status?.id > 3) {
                setIsOutputMatched(false);
                setOutput(data.compile_output || data.stderr || data.status.description || "Error compiling code.");
            } else {
                setIsOutputMatched(false);
                setOutput("Error compiling code.");
            }
        } catch (error) {
            console.error("Execution error:", error);
            setOutput("Network error connecting to compiler.");
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
            
            {/* Header */}
            <header className="h-14 border-b border-slate-700 bg-slate-900 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-white font-black uppercase tracking-widest text-sm md:text-base">{challenge.title}</h1>
                    <span className={`px-3 py-1 rounded-md text-xs font-black flex items-center gap-1.5 shadow-inner ${timeLeft < 300 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        <Clock className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
                    </span>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-md text-xs font-black uppercase flex items-center gap-1.5 shadow-inner">
                        <AlertOctagon className="w-3.5 h-3.5" /> Warnings: {warnings}/3
                    </span>
                </div>
                
                {/* Student Info Block */}
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
                    <div className="flex items-center gap-1.5" title="Year & Section">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white">Yr {studentUser.yearOfStudy || 'N/A'} - Sec {studentUser.section || 'N/A'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-auto md:ml-0">
                    <select 
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-lg border border-slate-700 outline-none"
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                    </select>
                    {!isFullscreen && (
                        <button onClick={() => document.documentElement.requestFullscreen()} className="text-blue-400 flex items-center gap-1 text-xs font-bold hover:text-blue-300">
                            <Maximize className="w-4 h-4" /> Go Fullscreen
                        </button>
                    )}
                    {isOutputMatched && (
                        <button onClick={() => submitAssessment()} className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-lg shadow-lg flex items-center gap-1 transition-all">
                            <Save className="w-4 h-4" /> Submit Test
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Problem Statement */}
                <div className="w-1/3 border-r border-slate-700 bg-slate-800/50 p-6 overflow-y-auto custom-scrollbar">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4">Problem Statement</h2>
                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {challenge.problemStatement}
                    </div>
                    
                    <div className="mt-8 space-y-4">
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sample Input</h3>
                            <pre className="p-3 bg-slate-900 rounded-lg text-slate-300 font-mono text-sm">{challenge.sampleInput || 'No input required'}</pre>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Expected Output</h3>
                            <pre className="p-3 bg-slate-900 rounded-lg text-slate-300 font-mono text-sm">{challenge.sampleOutput || 'Varies'}</pre>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Editor & Output */}
                <div className="w-2/3 flex flex-col bg-[#1e1e1e]">
                    {/* Code Editor */}
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            defaultLanguage="python"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value)}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                contextmenu: false // Disable right click in editor
                            }}
                        />
                    </div>
                    
                    {/* Console Output */}
                    <div className="h-64 border-t border-slate-700 bg-slate-900 flex flex-col shrink-0">
                        <div className="h-10 border-b border-slate-800 flex items-center justify-between px-4">
                            <span className="text-slate-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Terminal className="w-4 h-4" /> Terminal Output
                            </span>
                            <button 
                                onClick={runCode}
                                disabled={isRunning}
                                className={`px-4 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${isRunning ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50'}`}
                            >
                                <Play className="w-3 h-3" /> {isRunning ? 'Compiling...' : 'Run Code'}
                            </button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-green-400 whitespace-pre-wrap">
                            {output || 'Output will appear here...'}
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
