
import React, { useState, useEffect, useRef } from 'react';
// Fix: Import local types only from local types file
import { Slide, SlideLayout, AspectRatio, LINE_HEIGHT_OPTIONS, LAYOUT_METADATA } from '../types';
// Fix: Import GoogleGenAI and Modality from @google/genai as required
import { GoogleGenAI, Modality } from "@google/genai";
import hljs from 'highlight.js';

// Base64 decoding helper for TTS
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface PresentationViewProps {
  slides: Slide[];
  aspectRatio: AspectRatio;
  onClose: () => void;
  initialIndex: number;
}

const PEN_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'White', value: '#ffffff' }
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PresentationView: React.FC<PresentationViewProps> = ({ slides, aspectRatio, onClose, initialIndex }) => {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [isPenActive, setIsPenActive] = useState(false);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: 0, y: 0 });
  const [isCaptureMode, setIsCaptureMode] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Regional Capture States
  const [captureRect, setCaptureRect] = useState<Rect | null>(null);
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);

  const [penColor, setPenColor] = useState('#eab308');
  const [penWidth, setPenWidth] = useState(5);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const codeRef = useRef<HTMLElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const dims = {
    '16:9': { w: 1920, h: 1080 },
    '9:16': { w: 1080, h: 1920 },
    '1:1': { w: 1080, h: 1080 }
  };
  const VIRTUAL_WIDTH = dims[aspectRatio].w;
  const VIRTUAL_HEIGHT = dims[aspectRatio].h;

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const widthScale = (windowWidth * 0.95) / VIRTUAL_WIDTH;
      const heightScale = (windowHeight * 0.95) / VIRTUAL_HEIGHT;
      setScale(Math.min(widthScale, heightScale));
    };
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') setIndex(p => Math.min(slides.length - 1, p + 1));
      if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') setIndex(p => Math.max(0, p - 1));
      if (e.key === 'Escape') {
        if (isCaptureMode) {
            if (captureRect) setCaptureRect(null);
            else setIsCaptureMode(false);
        } else {
            onClose();
        }
      }
      if (e.key.toLowerCase() === 'v') setIsCaptureMode(prev => !prev);
      if (e.key.toLowerCase() === 'l') setIsLaserActive(prev => !prev);
      if (e.key.toLowerCase() === 'r') handleToggleRecording();
      if (e.key.toLowerCase() === 'c' && isCaptureMode) setCaptureRect(null);
      if (e.key.toLowerCase() === 'n') handleNarrate();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKey);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKey);
    };
  }, [slides.length, onClose, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, isCaptureMode, captureRect, isRecording]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = VIRTUAL_WIDTH;
      canvasRef.current.height = VIRTUAL_HEIGHT;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctxRef.current = ctx;
      }
    }
  }, [VIRTUAL_WIDTH, VIRTUAL_HEIGHT, index]);

  useEffect(() => {
    const currentSlide = slides[index];
    if (currentSlide?.layout === SlideLayout.CODE && codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [index, slides]);

  const handleToggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT },
        audio: true
      });
      streamRef.current = stream;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `STEM_Deployment_${Date.now()}.webm`;
        a.click();
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      console.error("Recording failed to start", e);
    }
  };

  const handleNarrate = async () => {
    const slide = slides[index];
    const textToSpeak = slide.notes || `Slide title: ${slide.title}. ${slide.subtitle}`;
    if (!textToSpeak || isNarrating) return;

    setIsNarrating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read professionally as a technical robotics lead: ${textToSpeak}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsNarrating(false);
        source.start();
      } else {
        setIsNarrating(false);
      }
    } catch (e) {
      console.error("Narration failed", e);
      setIsNarrating(false);
    }
  };

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPointerPos(e);

    if (isCaptureMode && !isPenActive && !isLaserActive) {
      setIsSelectingRegion(true);
      setSelectionStart(pos);
      setCaptureRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
      return;
    }

    if (!isPenActive || isLaserActive || !ctxRef.current || !canvasRef.current) return;
    drawingRef.current = true;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(pos.x, pos.y);
    ctxRef.current.strokeStyle = penColor;
    ctxRef.current.lineWidth = penWidth;
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPointerPos(e);
    
    if (isLaserActive) {
      setLaserPos(pos);
    }

    if (isSelectingRegion && selectionStart) {
      const x = Math.min(pos.x, selectionStart.x);
      const y = Math.min(pos.y, selectionStart.y);
      const w = Math.abs(pos.x - selectionStart.x);
      const h = Math.abs(pos.y - selectionStart.y);
      setCaptureRect({ x, y, w, h });
      return;
    }

    if (drawingRef.current && ctxRef.current && canvasRef.current) {
      ctxRef.current.lineTo(pos.x, pos.y);
      ctxRef.current.stroke();
    }
  };

  const stopDrawing = () => {
    if (drawingRef.current && ctxRef.current) ctxRef.current.closePath();
    drawingRef.current = false;
    setIsSelectingRegion(false);
    setSelectionStart(null);
    
    if (captureRect && (captureRect.w < 10 || captureRect.h < 10)) {
        setCaptureRect(null);
    }
  };

  const slide = slides[index] || slides[0];
  const virtualBodySize = slide.bodySize * (aspectRatio === '9:16' ? 1.0 : 1.5);
  // Fix: Removed isTitleLayout variable to use slide.layout directly for TypeScript narrowing
  const contentScale = slide.contentScale || 1.0;
  const progress = ((index + 1) / slides.length) * 100;

  const lineHeightClass = LINE_HEIGHT_OPTIONS.find(opt => opt.value === slide.lineHeight)?.class || 'leading-normal';
  const fontWeightClass = slide.fontWeight === 'bold' ? 'font-bold' : slide.fontWeight === 'black' ? 'font-black' : 'font-normal';
  const trackingStyle = { letterSpacing: `${slide.letterSpacing || 0}px` };

  const getCodeAnimationStyle = () => {
    if (slide.layout !== SlideLayout.CODE || !slide.codeAnimationType || slide.codeAnimationType === 'none') return {};
    const duration = slide.codeAnimationSpeed || 1.5;
    
    switch (slide.codeAnimationType) {
      case 'typewriter':
        return { animation: `codeRevealWidth ${duration}s steps(60, end) forwards`, whiteSpace: 'nowrap', overflow: 'hidden' };
      case 'fade':
        return { animation: `codeFadeIn ${duration}s ease-out forwards`, opacity: 0 };
      case 'slide-up':
        return { animation: `codeSlideUp ${duration}s cubic-bezier(0.16, 1, 0.3, 1) forwards`, opacity: 0, transform: 'translateY(50px)' };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center overflow-hidden select-none touch-none">
      
      {!isCaptureMode && (
        <>
          <header className="fixed top-0 inset-x-0 h-20 px-8 flex items-center justify-between z-[150] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <h1 className="text-white/40 text-[10px] font-black uppercase tracking-[0.6em]">BROADCAST LIVE</h1>
                 {isRecording && <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_15px_#ef4444]" />}
               </div>
               <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-1">MODULE_{index + 1} / {aspectRatio}</p>
            </div>
            <div className="flex items-center gap-4 pointer-events-auto">
               <button 
                 onClick={handleToggleRecording} 
                 className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-white/60 hover:bg-white hover:text-black'}`}
               >
                 {isRecording ? '⏹ Stop Recording' : '⏺ Record (R)'}
               </button>
               <button 
                 onClick={handleNarrate} 
                 disabled={isNarrating}
                 className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${isNarrating ? 'bg-indigo-600 animate-pulse text-white' : 'bg-white/10 text-white/60 hover:bg-white hover:text-black'}`}
               >
                 {isNarrating ? '🔊 Narrating' : '🔈 Narrate (N)'}
               </button>
               <button onClick={() => setIsCaptureMode(true)} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">● Capture Mode</button>
               <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-all">✕</button>
            </div>
          </header>

          <nav className="fixed bottom-12 inset-x-0 flex justify-center z-[150]">
             <div className="bg-slate-900/90 backdrop-blur-3xl border border-white/10 p-4 rounded-[32px] flex items-center gap-5 shadow-5xl animate-in slide-in-from-bottom-8">
                <div className="flex gap-2">
                  <button onClick={() => setIndex(i => Math.max(0, i-1))} className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-xs lg:text-base">◀</button>
                  <button onClick={() => setIndex(i => Math.min(slides.length-1, i+1))} className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-xs lg:text-base">▶</button>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex gap-2">
                   <button onClick={() => { setIsPenActive(!isPenActive); setIsLaserActive(false); }} className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all text-sm lg:text-xl ${isPenActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>🖌️</button>
                   <button onClick={() => { setIsLaserActive(!isLaserActive); setIsPenActive(false); }} className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center transition-all text-sm lg:text-xl ${isLaserActive ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>🔴</button>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-3">
                   {PEN_COLORS.map(c => (
                     <button key={c.value} onClick={() => {setPenColor(c.value); setIsPenActive(true); setIsLaserActive(false);}} className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 transition-all ${penColor === c.value ? 'border-white scale-125' : 'border-white/20 hover:scale-110'}`} style={{backgroundColor: c.value}} />
                   ))}
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col gap-1 items-center px-2 min-w-[100px]">
                   <span className="text-[7px] lg:text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Pen Weight</span>
                   <div className="flex items-center gap-2 w-full">
                      <span className="text-[8px] font-mono text-white/20">1</span>
                      <input type="range" min="1" max="30" step="1" value={penWidth} onChange={(e) => setPenWidth(parseInt(e.target.value))} className="w-16 lg:w-24 accent-indigo-500 bg-white/10 h-1 rounded-full appearance-none cursor-pointer" />
                      <span className="text-[8px] font-mono text-indigo-400 w-4">{penWidth}</span>
                   </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <button onClick={() => { if(ctxRef.current) ctxRef.current.clearRect(0,0,VIRTUAL_WIDTH,VIRTUAL_HEIGHT); }} className="px-3 lg:px-4 text-[9px] lg:text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors">Clear</button>
             </div>
          </nav>
        </>
      )}

      {isCaptureMode && (
        <div className="fixed top-4 left-4 right-4 z-[200] flex justify-between items-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4 pointer-events-auto">
             <div className="flex items-center gap-4">
                <span className="text-rose-500 animate-pulse font-black text-[10px] uppercase tracking-[0.3em]">● CAPTURE ZONE ACTIVE</span>
                <span className="w-px h-4 bg-white/10" />
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{captureRect ? 'Area Selected' : 'Drag to Define Region'}</span>
             </div>
          </div>
          <div className="flex gap-3 pointer-events-auto">
            {captureRect && <button onClick={() => setCaptureRect(null)} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Reset (C)</button>}
            <button onClick={() => setIsCaptureMode(false)} className="px-6 py-3 bg-white text-black font-black text-[10px] rounded-xl uppercase tracking-widest hover:bg-slate-200 transition-all shadow-2xl">Exit (V)</button>
          </div>
        </div>
      )}

      <div 
        ref={containerRef} 
        onMouseDown={startDrawing}
        onMouseMove={handlePointerMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={handlePointerMove}
        onTouchEnd={stopDrawing}
        className={`relative overflow-hidden shadow-5xl transition-transform duration-500 ease-out flex flex-col shrink-0 ${slide.fontFamily}`} 
        style={{ width: `${VIRTUAL_WIDTH}px`, height: `${VIRTUAL_HEIGHT}px`, transform: `scale(${scale})`, cursor: isSelectingRegion ? 'crosshair' : isPenActive ? 'crosshair' : isLaserActive ? 'none' : isCaptureMode ? 'crosshair' : 'default', backgroundColor: '#020617' }}
      >
        <div className={`absolute inset-0 z-0 ${slide.background} ${slide.backgroundAnimation && `anim-bg-${slide.backgroundAnimation}`}`}>
          {slide.backgroundImage && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: slide.backgroundSize || 'cover', backgroundPosition: 'center', opacity: (slide.backgroundOpacity || 20) / 100, mixBlendMode: (slide.backgroundBlendMode as any) || 'overlay' }} />}
        </div>
        <canvas ref={canvasRef} className="absolute inset-0 z-50 pointer-events-none" />

        <main className={`flex-1 flex flex-col items-center justify-center relative z-10 p-24 ${slide.animation ? `anim-${slide.animation}` : 'anim-fade'}`}>
           {/* Fix: Narrowed SlideLayout to resolve unintentional comparison error by using direct comparison in the chain */}
           {slide.layout === SlideLayout.TITLE ? (
             <div className="flex flex-col items-center text-center gap-16 max-w-[90%]">
                <h1 className={`font-black text-white drop-shadow-5xl tracking-tighter leading-[0.85] text-reveal ${fontWeightClass} ${lineHeightClass}`} style={{ fontSize: `${slide.titleSize * (aspectRatio === '9:16' ? 1.5 : 2.5)}px`, ...trackingStyle }} dangerouslySetInnerHTML={{ __html: slide.title }} />
                <div className="h-2 w-48 bg-indigo-500 rounded-full" />
                <p className="text-white/60 font-light uppercase text-reveal-delayed" style={{ fontSize: `${slide.bodySize * 1.5}px`, letterSpacing: '0.6em' }} dangerouslySetInnerHTML={{ __html: slide.subtitle }} />
             </div>
           ) : slide.layout === SlideLayout.IMAGE ? (
             <div className="w-full h-full flex flex-col gap-12">
                <div className="shrink-0 border-l-[12px] border-indigo-500/40 pl-12 text-reveal">
                   <p className="text-indigo-400 font-black uppercase mb-4" style={{ fontSize: `${slide.bodySize * 0.9}px`, letterSpacing: '0.5em' }}>{slide.subtitle || 'VISUAL ASSET'}</p>
                   <h2 className="text-white font-black leading-tight" style={{ fontSize: `${slide.titleSize * 0.8}px`, ...trackingStyle }} dangerouslySetInnerHTML={{ __html: slide.title }} />
                </div>
                <div className="flex-1 bg-black/20 rounded-[4rem] border border-white/5 shadow-inner overflow-hidden flex items-center justify-center p-8 animate-in zoom-in group/mainimg">
                   {slide.content[0]?.value ? (
                     <img src={slide.content[0].value} className="max-h-full max-w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover/mainimg:scale-[1.02]" />
                   ) : (
                     <span className="text-white/10 font-black uppercase tracking-[1em] text-4xl">Waiting for Uplink...</span>
                   )}
                </div>
             </div>
           ) : slide.layout === SlideLayout.COMPONENTS ? (
             <div className="w-full flex flex-col h-full">
                <div className="mb-12 border-l-[12px] border-emerald-500/40 pl-12 text-reveal">
                   <p className="text-emerald-400 font-black uppercase" style={{ fontSize: `${slide.bodySize * 1.2}px`, letterSpacing: '0.5em' }}>{slide.subtitle || 'COMPONENTS REQUIRED'}</p>
                </div>
                <div className="flex-1 bg-slate-900/60 border border-white/10 rounded-[3rem] overflow-hidden flex flex-col shadow-4xl animate-in zoom-in">
                  <div className="grid grid-cols-[150px_1fr_150px] bg-emerald-500/10 border-b border-white/10 px-12 py-8">
                    <span className="text-[14px] font-black text-emerald-500 uppercase tracking-[0.3em]">Module</span>
                    <span className="text-[14px] font-black text-emerald-500 uppercase tracking-[0.3em] pl-8">Specification</span>
                    <span className="text-[14px] font-black text-emerald-500 uppercase tracking-[0.3em] text-center">Unit Qty</span>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide p-8 space-y-6">
                    {slide.content.filter(i => i.type === 'table-row').map((item, idx) => {
                      const data = JSON.parse(item.value || '{"img":"","desc":"","qty":""}');
                      return (
                        <div key={item.id} className="grid grid-cols-[150px_1fr_150px] items-center bg-white/5 border border-white/5 rounded-3xl p-6 animate-in slide-in-from-bottom-4" style={{animationDelay: `${idx * 100}ms`}}>
                          <div className="w-[120px] h-[90px] bg-black/60 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                            {data.img ? <img src={data.img} className="w-full h-full object-cover" /> : <span className="text-3xl opacity-20">📦</span>}
                          </div>
                          <div className="pl-10 pr-8">
                             <p className="text-white font-medium leading-relaxed" style={{ fontSize: `${virtualBodySize * 0.8}px` }} dangerouslySetInnerHTML={{__html: data.desc}} />
                          </div>
                          <div className="flex justify-center">
                             <span className="bg-emerald-500 text-white font-black px-6 py-3 rounded-2xl shadow-lg" style={{ fontSize: `${virtualBodySize * 0.9}px` }}>{data.qty}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
             </div>
           ) : slide.layout === SlideLayout.SPEC ? (
             <div className="w-full flex flex-col h-full">
                <div className="mb-12 border-l-[12px] border-emerald-500/40 pl-12 text-reveal">
                   <p className="text-emerald-400 font-black uppercase" style={{ fontSize: `${slide.bodySize * 1.2}px`, letterSpacing: '0.5em' }}>{slide.subtitle || 'HARDWARE SPECS'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                   {slide.content.filter(i => i.type === 'spec-item').map((item, idx) => (
                      <div key={item.id} className="bg-slate-900/80 border border-white/10 rounded-[2.5rem] p-12 flex flex-col gap-6 shadow-2xl animate-in zoom-in" style={{ animationDelay: `${idx * 80}ms` }}>
                         <div className="flex justify-between items-center">
                            <span className="text-[12px] font-black text-emerald-500/40 uppercase tracking-[0.3em]">{item.label}</span>
                            <div className={`w-3 h-3 rounded-full animate-pulse bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]`} />
                         </div>
                         <h3 className="text-white font-black text-5xl tracking-tight" style={{ fontSize: `${virtualBodySize * 1.5}px`, ...trackingStyle }}>{item.value}</h3>
                         <div className="mt-auto h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500/60" style={{ width: `${Math.max(30, Math.random() * 100)}%` }} /></div>
                      </div>
                   ))}
                </div>
             </div>
           ) : slide.layout === SlideLayout.QUIZ ? (
             <div className="w-full flex flex-col h-full">
                <div className="bg-indigo-600/10 border border-indigo-500/20 p-12 rounded-[3.5rem] shadow-4xl text-reveal mb-12">
                   <h2 className="text-center text-indigo-100 font-black" style={{ fontSize: `${slide.bodySize * 1.3}px`, ...trackingStyle }} dangerouslySetInnerHTML={{ __html: slide.content[0]?.value }} />
                </div>
                <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                   {(slide.content.filter(i => i.type === 'quiz-option')).map((opt, idx) => (
                     <div key={opt.id} className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl flex items-center gap-6 group hover:bg-white/10 transition-all cursor-pointer animate-in fade-in" style={{ animationDelay: `${idx * 150}ms` }}>
                        <span className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">{String.fromCharCode(65 + idx)}</span>
                        <p className="flex-1 font-bold text-white/80" style={{ fontSize: `${slide.bodySize * 0.9}px`, ...trackingStyle }} dangerouslySetInnerHTML={{ __html: opt.value }} />
                     </div>
                   ))}
                </div>
             </div>
           ) : (
             <div className="w-full flex flex-col h-full">
                {slide.subtitle && (
                   <div className="mb-12 border-l-[12px] border-indigo-500/40 pl-12 text-reveal">
                      <p className="text-indigo-400 font-black uppercase" style={{ fontSize: `${slide.bodySize * 1.2}px`, letterSpacing: '0.5em' }}>{slide.subtitle}</p>
                   </div>
                )}
                <div className={`flex-1 min-h-0 overflow-hidden ${fontWeightClass} ${lineHeightClass}`} style={{ transform: `scale(${contentScale})`, transformOrigin: 'top center' }}>
                   {slide.layout === SlideLayout.CONTENT || slide.layout === SlideLayout.ACTIVITY ? (
                     <ul className="space-y-12">
                       {slide.content.map((item, idx) => (
                         <li key={item.id} className="text-white flex items-start gap-10 text-reveal-delayed" style={{ fontSize: `${virtualBodySize}px`, animationDelay: `${idx * 100}ms`, ...trackingStyle }}>
                           <span className="text-indigo-500 font-black text-4xl mt-1 shrink-0">{slide.layout === SlideLayout.ACTIVITY ? '🎯' : '•'}</span>
                           <span dangerouslySetInnerHTML={{ __html: item.value }} />
                         </li>
                       ))}
                     </ul>
                   ) : slide.layout === SlideLayout.TWO_COLUMN ? (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 h-full">
                        {slide.content.slice(0, 2).map((col, idx) => (
                           <div key={idx} className="bg-white/5 border border-white/5 p-12 rounded-[3rem] shadow-4xl flex items-center justify-center">
                              {col.type === 'image' ? <img src={col.value} className="max-h-full object-contain" /> : <div className="text-white font-medium text-center" style={{fontSize: `${virtualBodySize * 0.9}px`, ...trackingStyle}} dangerouslySetInnerHTML={{__html: col.value}} />}
                           </div>
                        ))}
                     </div>
                   ) : slide.layout === SlideLayout.CODE ? (
                     <div className="bg-[#010409] rounded-[4rem] border border-white/10 p-12 h-full shadow-5xl overflow-hidden flex flex-col">
                        {slide.content[0]?.type === 'image' ? (
                          <img src={slide.content[0].value} className="w-full h-full object-contain" />
                        ) : (
                          <pre className="p-8 overflow-hidden"><code ref={codeRef} className="font-mono text-white/90 leading-relaxed block" style={{ fontSize: `${virtualBodySize * 0.8}px`, ...getCodeAnimationStyle() }}>{slide.content[0]?.value}</code></pre>
                        )}
                     </div>
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-[5rem] overflow-hidden border border-white/5 shadow-inner">
                        {/* Fix: Narrowed layout means IMAGE is already handled; correctly checking for VIDEO or falling back to generic display */}
                        {slide.layout === SlideLayout.VIDEO ? (
                           <video src={slide.content[0]?.value} autoPlay muted loop className="max-h-full" />
                        ) : (
                           <img src={slide.content[0]?.value} className="max-h-full object-contain" />
                        )}
                     </div>
                   )}
                </div>
             </div>
           )}
        </main>

        <div className="absolute bottom-0 inset-x-0 h-2 bg-white/5 z-[60]"><div className="h-full bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      </div>
      <style>{`
        @keyframes laserGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.4); opacity: 1; box-shadow: 0 0 30px 10px rgba(255, 0, 0, 0.6); }
        }
      `}</style>
    </div>
  );
};

export default PresentationView;
