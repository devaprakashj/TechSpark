import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Download, X, RefreshCw, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import ritLogo from '../assets/rit-logo.png';
import tsLogo from '../assets/techspark-logo.png';

/* ─── Poster dimensions ───────────────────────────── */
const PW = 1080, PH = 1920;
const PHX = 60, PHY = 510, PHW = 960, PHH = 840;   // photo window  (PHY raised so tagline fits above)

const loadImg = src => new Promise(res => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
});

function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
}

/* thin gradient H-rule with centre diamond */
function hRule(g, y, opacity = 1) {
    const grad = g.createLinearGradient(0, 0, PW, 0);
    grad.addColorStop(0, 'rgba(255,150,210,0)');
    grad.addColorStop(0.25, `rgba(255,150,210,${opacity * 0.55})`);
    grad.addColorStop(0.75, `rgba(180,130,255,${opacity * 0.55})`);
    grad.addColorStop(1, 'rgba(180,130,255,0)');
    g.strokeStyle = grad; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(80, y); g.lineTo(PW - 80, y); g.stroke();
    // diamond
    g.save(); g.globalAlpha = opacity * 0.8;
    g.fillStyle = '#ffb3da';
    g.translate(PW / 2, y); g.rotate(Math.PI / 4);
    g.fillRect(-5, -5, 10, 10);
    g.restore();
}

/* ══════════════════════════════════════════════════
   POSTER BUILDER
══════════════════════════════════════════════════ */
async function buildPoster(photoDataUrl, userName) {
    const [photo, rit, ts] = await Promise.all([
        loadImg(photoDataUrl), loadImg(ritLogo), loadImg(tsLogo),
    ]);

    const c = document.createElement('canvas');
    c.width = PW; c.height = PH;
    const g = c.getContext('2d');

    /* ── BACKGROUND ──────────────────────────────── */
    // Dark base: near-black purple → deep magenta
    const bg = g.createLinearGradient(0, 0, PW * 0.4, PH);
    bg.addColorStop(0, '#0c0020');
    bg.addColorStop(0.30, '#1e0038');
    bg.addColorStop(0.60, '#3a0050');
    bg.addColorStop(0.85, '#5e0055');
    bg.addColorStop(1, '#8b0050');
    g.fillStyle = bg; g.fillRect(0, 0, PW, PH);

    // Radial glow – top centre (pink)
    const tg = g.createRadialGradient(PW / 2, 0, 60, PW / 2, 320, 660);
    tg.addColorStop(0, 'rgba(200, 50, 200, 0.40)');
    tg.addColorStop(1, 'rgba(200, 50, 200, 0)');
    g.fillStyle = tg; g.fillRect(0, 0, PW, 900);

    // Radial glow – bottom centre (rose)
    const btg = g.createRadialGradient(PW / 2, PH, 80, PW / 2, PH - 500, 700);
    btg.addColorStop(0, 'rgba(220, 60, 160, 0.28)');
    btg.addColorStop(1, 'rgba(220, 60, 160, 0)');
    g.fillStyle = btg; g.fillRect(0, PH - 700, PW, 700);

    // Subtle noise / grain feel via tiny scattered dots
    for (let i = 0; i < 180; i++) {
        const sx = Math.random() * PW;
        const sy = Math.random() * PH;
        const sr = Math.random() * 1.4 + 0.4;
        g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2);
        g.fillStyle = `rgba(255,200,240,${Math.random() * 0.07 + 0.01})`;
        g.fill();
    }

    g.textAlign = 'center';

    /* ── LOGOS (top-left: RIT  |  top-right: TechSpark) ── */
    const LH = 50, LPAD = 30, LTOP = 20, LBAR = 100;
    const PILL_H = LBAR - LTOP * 2;  // 60px tall pills

    // Helper: draw a white pill behind logo
    const logoPill = (px, py, pw, ph) => {
        // white fill
        g.save();
        g.shadowColor = 'rgba(200,50,200,0.25)';
        g.shadowBlur = 14;
        g.fillStyle = 'rgba(255,255,255,0.93)';
        rr(g, px, py, pw, ph, 16); g.fill();
        g.restore();
        // thin pink border
        g.strokeStyle = 'rgba(255,150,210,0.40)'; g.lineWidth = 1.5;
        rr(g, px, py, pw, ph, 16); g.stroke();
    };

    // RIT logo – left
    if (rit) {
        const lw = Math.round((rit.naturalWidth / rit.naturalHeight) * LH);
        const pillW = lw + 28;
        logoPill(LPAD, LTOP, pillW, PILL_H);
        g.drawImage(rit, LPAD + 14, LTOP + (PILL_H - LH) / 2, lw, LH);
    }

    // TechSpark logo – right
    if (ts) {
        const lw = Math.round((ts.naturalWidth / ts.naturalHeight) * LH);
        const pillW = lw + 28;
        logoPill(PW - LPAD - pillW, LTOP, pillW, PILL_H);
        g.drawImage(ts, PW - LPAD - pillW + 14, LTOP + (PILL_H - LH) / 2, lw, LH);
    }


    /* ── TOP HEADER ──────────────────────────────── */
    hRule(g, 112, 0.7);

    // "INTERNATIONAL WOMEN'S DAY"
    g.fillStyle = 'rgba(255,220,240,0.92)';
    g.font = '700 44px Arial, sans-serif';
    g.letterSpacing = '5px';
    g.fillText('INTERNATIONAL WOMEN\'S DAY', PW / 2, 168);
    g.letterSpacing = '0px';

    // "MARCH 8, 2026"
    g.fillStyle = 'rgba(220,180,255,0.78)';
    g.font = '600 30px Arial, sans-serif';
    g.letterSpacing = '6px';
    g.fillText('M A R C H   8,   2 0 2 6', PW / 2, 222);
    g.letterSpacing = '0px';

    hRule(g, 254, 0.6);

    /* ── MAIN HEADLINE ───────────────────────────── */
    // "SHE IS THE FUTURE OF TECH" — big, gradient, glow
    const hg = g.createLinearGradient(80, 0, PW - 80, 0);
    hg.addColorStop(0, '#ffb3e6');
    hg.addColorStop(0.35, '#ffffff');
    hg.addColorStop(0.65, '#ffffff');
    hg.addColorStop(1, '#d8b0ff');
    g.shadowColor = 'rgba(255,100,200,0.70)'; g.shadowBlur = 38;
    g.fillStyle = hg;
    g.font = '900 86px "Arial Black", Arial, sans-serif';
    g.fillText('✨ Celebrating Her ✨', PW / 2, 370);
    g.shadowBlur = 0;

    /* ── TAGLINE ─────────────────────────────────── */
    g.fillStyle = 'rgba(255,180,230,0.75)';
    g.font = 'bold 28px Arial, sans-serif';
    g.letterSpacing = '4px';
    g.fillText('THINK  •  BUILD  •  SPARK', PW / 2, 472);  // above PHY=510
    g.letterSpacing = '0px';

    // separator rule between tagline and photo
    hRule(g, 494, 0.50);


    /* ── PHOTO ───────────────────────────────────── */
    // outer soft glow
    g.save();
    g.shadowColor = 'rgba(255,100,200,0.38)'; g.shadowBlur = 32;
    rr(g, PHX - 4, PHY - 4, PHW + 8, PHH + 8, 30);
    g.strokeStyle = 'rgba(255,160,220,0.40)'; g.lineWidth = 1.5; g.stroke();
    g.restore();

    // thin white border (2-4px)
    rr(g, PHX - 3, PHY - 3, PHW + 6, PHH + 6, 30);
    g.strokeStyle = 'rgba(255,255,255,0.38)'; g.lineWidth = 3; g.stroke();

    // photo clipped
    g.save();
    rr(g, PHX, PHY, PHW, PHH, 26); g.clip();

    if (photo) {
        const pa = photo.naturalWidth / photo.naturalHeight;
        const ha = PHW / PHH;
        let dw, dh, dx, dy;
        if (pa > ha) { dh = PHH; dw = PHH * pa; dx = PHX - (dw - PHW) / 2; dy = PHY; }
        else { dw = PHW; dh = PHW / pa; dy = PHY - (dh - PHH) / 2; dx = PHX; }
        g.drawImage(photo, dx, dy, dw, dh);

        // inner shadow (edge vignette inside photo)
        const iv = g.createRadialGradient(PHX + PHW / 2, PHY + PHH / 2, PHW * 0.28, PHX + PHW / 2, PHY + PHH / 2, PHW * 0.70);
        iv.addColorStop(0, 'transparent');
        iv.addColorStop(1, 'rgba(40,0,60,0.28)');
        g.fillStyle = iv; g.fillRect(PHX, PHY, PHW, PHH);
    }
    g.restore();

    // Minimal corner dots (small, clean)
    const cornerPts = [
        [PHX + 2, PHY + 2], [PHX + PHW - 2, PHY + 2],
        [PHX + 2, PHY + PHH - 2], [PHX + PHW - 2, PHY + PHH - 2],
    ];
    cornerPts.forEach(([cx, cy]) => {
        g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255,180,220,0.70)'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.50)'; g.lineWidth = 1.5; g.stroke();
    });

    /* ── BOTTOM ──────────────────────────────────── */
    const BOT = PHY + PHH;   // 1310

    hRule(g, BOT + 32, 0.8);

    // Name – big bold
    const ng = g.createLinearGradient(100, 0, PW - 100, 0);
    ng.addColorStop(0, '#ffa8db');
    ng.addColorStop(0.5, '#ffffff');
    ng.addColorStop(1, '#d0a8ff');
    g.shadowColor = 'rgba(255,100,200,0.45)'; g.shadowBlur = 22;
    g.fillStyle = ng;
    g.font = '900 68px "Arial Black", Arial, sans-serif';
    g.fillText((userName || 'YOUR NAME').toUpperCase(), PW / 2, BOT + 128);
    g.shadowBlur = 0;

    // "TechSpark Club – RIT Chennai"
    g.fillStyle = 'rgba(220,185,255,0.82)';
    g.font = '600 34px Arial, sans-serif';
    g.fillText('TechSpark Club  –  RIT Chennai', PW / 2, BOT + 200);

    // Hashtag with glow
    const hash = g.createLinearGradient(260, 0, PW - 260, 0);
    hash.addColorStop(0, '#ff80c8'); hash.addColorStop(0.5, '#e0a0ff'); hash.addColorStop(1, '#ff80c8');
    g.shadowColor = 'rgba(255,80,180,0.35)'; g.shadowBlur = 16;
    g.fillStyle = hash;
    g.font = 'bold 36px Arial, sans-serif';
    g.fillText('#TechSparkWomen2026', PW / 2, BOT + 270);
    g.shadowBlur = 0;

    hRule(g, BOT + 310, 0.50);

    // Women's Day caption (small, subtle)
    g.fillStyle = 'rgba(255,180,220,0.45)';
    g.font = '500 22px Arial, sans-serif';
    g.fillText('HAPPY INTERNATIONAL WOMEN\'S DAY  •  MARCH 8, 2026', PW / 2, BOT + 360);

    // Bottom gradient bar
    const bb = g.createLinearGradient(0, 0, PW, 0);
    bb.addColorStop(0, '#ec4899'); bb.addColorStop(0.5, '#a855f7'); bb.addColorStop(1, '#ec4899');
    g.fillStyle = bb;
    g.fillRect(0, PH - 14, PW, 14);

    return c.toDataURL('image/png');
}

/* ══════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════ */
export default function SparkBooth({ isOpen, onClose, userName }) {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [photoData, setPhotoData] = useState(null);
    const [posterUrl, setPosterUrl] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [camError, setCamError] = useState(null);
    const [camReady, setCamReady] = useState(false);

    const startCamera = async () => {
        try {
            const ms = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false,
            });
            setStream(ms);
            if (videoRef.current) videoRef.current.srcObject = ms;
            setCamError(null);
        } catch { setCamError('Camera access denied. Please allow permissions.'); }
    };

    const stopCamera = useCallback(() => {
        if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
    }, [stream]);

    useEffect(() => {
        if (isOpen) {
            setPhotoData(null); setPosterUrl(null); setCountdown(null); setCamReady(false);
            startCamera();
        } else stopCamera();
        return () => stopCamera();
    }, [isOpen]); // eslint-disable-line

    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }
        snap();
    }, [countdown]); // eslint-disable-line

    const snap = () => {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;
        const { videoWidth: vw, videoHeight: vh } = v;
        const side = Math.min(vw, vh);
        const c2 = document.createElement('canvas');
        c2.width = side; c2.height = side;
        const ctx = c2.getContext('2d');
        ctx.translate(side, 0); ctx.scale(-1, 1);
        ctx.drawImage(v, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, side, side);
        setPhotoData(c2.toDataURL('image/jpeg', 0.97));
        setCountdown(null);
        confetti({
            particleCount: 220, spread: 110, origin: { y: 0.45 },
            colors: ['#f472b6', '#c084fc', '#fde047', '#a78bfa', '#f9a8d4', '#ffffff']
        });
    };

    useEffect(() => {
        if (!photoData) return;
        setProcessing(true);
        buildPoster(photoData, userName)
            .then(url => { setPosterUrl(url); setProcessing(false); })
            .catch(() => setProcessing(false));
    }, [photoData, userName]);

    const download = () => {
        if (!posterUrl) return;
        const a = document.createElement('a');
        a.download = `SparkBooth_WomensDay_${(userName || 'Student').replace(/\s+/g, '_')}.png`;
        a.href = posterUrl; a.click();
    };

    if (!isOpen) return null;

    const btn = { background: 'linear-gradient(90deg,#ec4899,#a855f7,#6366f1)', boxShadow: '0 4px 24px rgba(236,72,153,0.4)' };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
                style={{ background: 'rgba(8,0,18,0.96)' }}>

                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    className="relative w-full max-w-sm md:max-w-md flex flex-col overflow-hidden"
                    style={{
                        maxHeight: '96vh',
                        borderRadius: '2.2rem 2.2rem 0 0',
                        background: 'linear-gradient(160deg,#0c0020 0%,#1e0038 40%,#42003a 100%)',
                        boxShadow: '0 -6px 50px rgba(200,50,200,0.30), 0 0 0 1px rgba(255,120,200,0.12)',
                    }}>

                    {/* header */}
                    <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
                        <div>
                            <p className="text-white font-black text-base uppercase leading-none tracking-tight"
                                style={{ textShadow: '0 0 18px rgba(255,80,200,0.75)' }}>✦ SparkBooth</p>
                            <p className="text-pink-300 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                                Women's Day 2026 · Instagram Story
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full transition-all"
                            style={{ background: 'rgba(255,255,255,0.09)' }}>
                            <X className="w-4 h-4 text-pink-200" />
                        </button>
                    </div>

                    <div className="h-px mx-5 shrink-0 mb-1"
                        style={{ background: 'linear-gradient(90deg,transparent,rgba(255,120,200,0.4),transparent)' }} />

                    {/* scrollable body */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4 space-y-3">

                        {/* camera / photo box */}
                        <div className="relative overflow-hidden" style={{
                            aspectRatio: '1/1', borderRadius: '1.5rem',
                            border: '2px solid rgba(255,120,200,0.25)',
                            boxShadow: '0 0 36px rgba(200,50,200,0.22)',
                        }}>
                            {camError ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                                    style={{ background: '#0c0020' }}>
                                    <X className="w-10 h-10 text-pink-400 mb-3" />
                                    <p className="text-white text-sm font-bold mb-4">{camError}</p>
                                    <button onClick={startCamera} className="px-6 py-2.5 rounded-xl text-xs font-black uppercase text-white" style={btn}>
                                        Retry Camera
                                    </button>
                                </div>
                            ) : photoData ? (
                                <img src={photoData} alt="captured" className="w-full h-full object-cover" />
                            ) : (
                                <video ref={videoRef} autoPlay playsInline muted
                                    onLoadedMetadata={() => setCamReady(true)}
                                    className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                            )}

                            {countdown !== null && countdown > 0 && (
                                <div className="absolute inset-0 flex items-center justify-center z-10"
                                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                                    <motion.span key={countdown}
                                        initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="text-9xl font-black text-white"
                                        style={{ textShadow: '0 0 40px rgba(255,100,200,0.9)' }}>
                                        {countdown}
                                    </motion.span>
                                </div>
                            )}

                            {!photoData && !camError && (
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                                    <span className="text-[8px] text-white font-black uppercase tracking-widest">LIVE</span>
                                </div>
                            )}

                            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[8px] text-white font-black uppercase tracking-widest"
                                style={{ background: 'linear-gradient(90deg,#ec4899,#7c3aed)' }}>
                                9:16 STORY
                            </div>
                        </div>

                        {/* processing + preview */}
                        {processing && (
                            <div className="flex items-center justify-center gap-2 py-1.5">
                                <Loader2 className="w-4 h-4 text-pink-300 animate-spin" />
                                <span className="text-[10px] font-black text-pink-300 uppercase tracking-widest">Building story…</span>
                            </div>
                        )}
                        {posterUrl && !processing && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">
                                        Ready — 1080 × 1920
                                    </span>
                                </div>
                                <div className="overflow-hidden rounded-xl" style={{ height: '155px', background: '#050010' }}>
                                    <img src={posterUrl} alt="preview" className="w-full h-full object-contain" />
                                </div>
                            </motion.div>
                        )}

                        {/* step hints */}
                        {!photoData && (
                            <div className="grid grid-cols-3 gap-2">
                                {[['📸', 'Look at camera'], ['✨', 'She Is Future Of Tech'], ['⬇️', 'Download & Share']].map(([ic, lb]) => (
                                    <div key={lb} className="rounded-2xl p-3 text-center"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,120,200,0.15)' }}>
                                        <div className="text-xl mb-1">{ic}</div>
                                        <p className="text-[9px] font-black text-pink-200 uppercase tracking-wide leading-tight">{lb}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* controls */}
                    <div className="shrink-0 px-4 pb-7 pt-3"
                        style={{ borderTop: '1px solid rgba(255,120,200,0.10)', background: 'rgba(0,0,0,0.15)' }}>
                        {photoData ? (
                            <div className="flex gap-3">
                                <button onClick={() => { setPhotoData(null); setPosterUrl(null); }}
                                    className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-pink-200 flex items-center justify-center gap-2 transition-all"
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,120,200,0.20)' }}>
                                    <RefreshCw className="w-4 h-4" /> Retake
                                </button>
                                <button onClick={download} disabled={processing || !posterUrl}
                                    className="flex-[2] py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.02] active:scale-95 transition-all"
                                    style={btn}>
                                    {processing
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Composing…</>
                                        : <><Download className="w-4 h-4" /> Download Story</>}
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setCountdown(3)}
                                disabled={countdown !== null || !!camError || !camReady}
                                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] text-white flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.01] active:scale-95 transition-all"
                                style={btn}>
                                <Camera className="w-5 h-5" />
                                {countdown !== null ? 'Get Ready…' : 'Capture Moment ✨'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
