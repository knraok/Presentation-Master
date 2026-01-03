
import React, { useState, useEffect, useRef } from 'react';
import { Presentation, Slide, SlideLayout, AspectRatio, GRADIENTS, LAYOUT_METADATA } from './types';
import { INITIAL_PRESENTATION, createNewPresentation } from './constants';
import Sidebar from './components/Sidebar';
import EditorCanvas from './components/EditorCanvas';
import PresentationView from './components/PresentationView';
import AiAssistant from './components/AiAssistant';
import LibraryModal from './components/LibraryModal';

const DB_NAME = 'STEM_ROBOTICS_DB_V8_PRO';
const STORE_NAME = 'presentations_library';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 8);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const sanitizePresentation = (data: any): Presentation => {
  if (!data) return INITIAL_PRESENTATION;
  return {
    id: String(data.id || `deck-${Date.now()}`),
    title: String(data.title || 'Project'),
    subtitle: String(data.subtitle || ''),
    author: String(data.author || 'STEM'),
    aspectRatio: (data.aspectRatio === '9:16' || data.aspectRatio === '1:1' ? data.aspectRatio : '16:9') as AspectRatio,
    createdAt: String(data.createdAt || new Date().toLocaleString()),
    updatedAt: new Date().toLocaleString(),
    slides: Array.isArray(data.slides) ? data.slides.map((slide: any) => ({
      id: String(slide.id),
      layout: slide.layout as SlideLayout,
      title: String(slide.title || ''),
      subtitle: String(slide.subtitle || ''),
      notes: String(slide.notes || ''),
      background: String(slide.background || GRADIENTS[0]),
      backgroundImage: slide.backgroundImage ? String(slide.backgroundImage) : undefined,
      backgroundOpacity: Number(slide.backgroundOpacity || 20),
      backgroundBlendMode: String(slide.backgroundBlendMode || 'overlay'),
      backgroundSize: String(slide.backgroundSize || 'cover') as any,
      backgroundAnimation: String(slide.backgroundAnimation || 'none') as any,
      animation: String(slide.animation || 'fade') as any,
      codeAnimationType: (slide.codeAnimationType || 'none') as any,
      codeAnimationSpeed: Number(slide.codeAnimationSpeed || 1.5),
      order: Number(slide.order || 0),
      titleSize: Number(slide.titleSize || 64),
      bodySize: Number(slide.bodySize || 28),
      fontWeight: (slide.fontWeight || 'normal') as any,
      letterSpacing: Number(slide.letterSpacing || 0),
      contentScale: Number(slide.contentScale || 1.0),
      fontFamily: String(slide.fontFamily || 'font-sans'),
      lineHeight: String(slide.lineHeight || 'normal') as any,
      titleAlign: String(slide.titleAlign || 'left') as any,
      subtitleAlign: String(slide.subtitleAlign || 'left') as any,
      showSlideNumber: Boolean(slide.showSlideNumber),
      slideNumberPosition: String(slide.slideNumberPosition || 'bottom-right') as any,
      slideNumberFormat: String(slide.slideNumberFormat || 'prefix') as any,
      showBanner: Boolean(slide.showBanner),
      bannerImage: slide.bannerImage ? String(slide.bannerImage) : undefined,
      bannerHeight: Number(slide.bannerHeight || 60),
      bannerOpacity: Number(slide.bannerOpacity || 100),
      content: Array.isArray(slide.content) ? slide.content.map((item: any) => ({
        id: String(item.id),
        type: String(item.type || 'text') as any,
        value: String(item.value || ''),
        label: item.label ? String(item.label) : undefined,
        variant: item.variant ? String(item.variant) : undefined,
      })) : [],
    })) : [],
  };
};

const saveToDB = async (data: Presentation) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const sanitized = sanitizePresentation(data);
    store.put(sanitized);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(sanitized);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("DB Save Failed:", e);
    return data;
  }
};

const getAllFromDB = async (): Promise<Presentation[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return [];
  }
};

const deleteFromDB = async (id: string) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const App: React.FC = () => {
  const [presentation, setPresentation] = useState<Presentation>(INITIAL_PRESENTATION);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [lastSaved, setLastSaved] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSlide = (presentation?.slides && presentation.slides[currentSlideIndex]) || null;

  useEffect(() => {
    if (!presentation) return;
    const timer = setTimeout(() => {
      saveToDB(presentation).then((updated: any) => {
        if (updated?.updatedAt) setLastSaved(updated.updatedAt);
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [presentation]);

  const updateSlide = (updatedSlide: Slide) => {
    setPresentation(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id === updatedSlide.id ? updatedSlide : s)
    }));
  };

  const addSlide = (layout: SlideLayout = SlideLayout.CONTENT) => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      layout,
      title: layout === SlideLayout.TITLE ? 'CINEMATIC HEADER' : layout === SlideLayout.SPEC || layout === SlideLayout.COMPONENTS ? 'PAYLOAD ANALYSIS' : 'Module Segment',
      subtitle: layout === SlideLayout.TITLE ? 'High Fidelity Simulation' : layout === SlideLayout.COMPONENTS ? 'Bill of Materials' : 'Technical specifications',
      content: layout === SlideLayout.QUIZ 
        ? [
            { id: 'q1', type: 'text', value: 'Select the optimal actuation mechanism:' },
            { id: 'opt1', type: 'quiz-option', value: 'Brushless DC' },
            { id: 'opt2', type: 'quiz-option', value: 'Stepper Logic' },
            { id: 'opt3', type: 'quiz-option', value: 'Pneumatic Flow' },
            { id: 'opt4', type: 'quiz-option', value: 'Hydraulic Link' },
          ]
        : layout === SlideLayout.SPEC 
        ? [
            { id: 's1', type: 'spec-item', label: 'CPU', value: '8-Core 3.2GHz' },
            { id: 's2', type: 'spec-item', label: 'LATENCY', value: '1.2ms' },
            { id: 's3', type: 'spec-item', label: 'STATUS', value: 'Deployed' }
          ]
        : layout === SlideLayout.COMPONENTS
        ? [
            { id: 'c1', type: 'table-row', value: JSON.stringify({img:'', desc:'Micro-Controller Unit (ESP32)', qty:'1'}) },
            { id: 'c2', type: 'table-row', value: JSON.stringify({img:'', desc:'Lithium Ion Battery Pack 3S', qty:'2'}) }
          ]
        : layout === SlideLayout.TWO_COLUMN
        ? [
            { id: 'col1', type: 'text', value: 'Visual Reference A' },
            { id: 'col2', type: 'text', value: 'Visual Reference B' }
          ]
        : layout === SlideLayout.CODE
        ? [{ id: 'code1', type: 'code', value: '# STEM Robotics Protocol\ndef main():\n    print("Executing Logic...")' }]
        : [{ id: 'm1', type: 'bullet', value: 'Technical data node point' }],
      notes: '',
      background: currentSlide?.background || GRADIENTS[0],
      animation: 'fade',
      codeAnimationType: 'none',
      codeAnimationSpeed: 1.5,
      titleSize: 64,
      bodySize: 28,
      fontWeight: 'normal',
      letterSpacing: 0,
      contentScale: 1.0,
      fontFamily: currentSlide?.fontFamily || 'font-sans',
      lineHeight: 'normal',
      titleAlign: layout === SlideLayout.TITLE ? 'center' : 'left',
      subtitleAlign: layout === SlideLayout.TITLE ? 'center' : 'left',
      order: presentation.slides.length,
      showSlideNumber: true,
      slideNumberPosition: 'bottom-right',
      slideNumberFormat: 'prefix',
      showBanner: currentSlide?.showBanner ?? false,
      bannerImage: currentSlide?.bannerImage,
      bannerHeight: currentSlide?.bannerHeight ?? 60,
      bannerOpacity: currentSlide?.bannerOpacity ?? 100
    };
    setPresentation(prev => ({ ...prev, slides: [...prev.slides, newSlide] }));
    setCurrentSlideIndex(presentation.slides.length);
  };

  const deleteSlide = (id: string) => {
    if (presentation.slides.length <= 1) return;
    setPresentation(prev => {
      const filtered = prev.slides.filter(s => s.id !== id);
      return { ...prev, slides: filtered.map((s, i) => ({ ...s, order: i })) };
    });
    if (currentSlideIndex >= presentation.slides.length - 1) {
      setCurrentSlideIndex(Math.max(0, presentation.slides.length - 2));
    }
  };

  const duplicateSlide = (id: string) => {
    const slideToCopy = presentation.slides.find(s => id === s.id);
    if (!slideToCopy) return;
    const newSlide = { ...slideToCopy, id: `slide-copy-${Date.now()}`, order: presentation.slides.length };
    setPresentation(prev => ({ ...prev, slides: [...prev.slides, newSlide] }));
    setCurrentSlideIndex(presentation.slides.length);
  };

  const exportJSON = () => {
    try {
      const sanitized = sanitizePresentation(presentation);
      const data = JSON.stringify({ version: "1.6.0", payload: sanitized }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${presentation.title.replace(/\s+/g, '_') || 'STEM_Project'}.stemjson`;
      a.click();
    } catch (err) {
      alert("Export failed.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const deck = json.payload || json;
        const sanitized = sanitizePresentation(deck);
        setPresentation({ ...sanitized, id: `restored-${Date.now()}` });
        setCurrentSlideIndex(0);
      } catch (err) { alert("Import Failed."); }
    };
    reader.readAsText(file);
  };

  if (isPreviewMode) return <PresentationView slides={presentation.slides} aspectRatio={presentation.aspectRatio} onClose={() => setIsPreviewMode(false)} initialIndex={currentSlideIndex} />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <input type="file" ref={fileInputRef} className="hidden" accept=".stemjson" onChange={handleImport} />
      
      <nav className="h-16 lg:h-20 bg-slate-900/90 backdrop-blur-3xl border-b border-white/10 px-4 lg:px-8 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-2 lg:gap-8">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">{isSidebarOpen ? '⇠' : '⇢'}</button>
          <div className="flex flex-col">
            <input className="text-sm lg:text-base font-black bg-transparent border-none p-0 focus:ring-0 w-32 lg:w-80 truncate hover:bg-white/5 px-2 rounded transition-all" value={presentation.title} onChange={(e) => setPresentation({...presentation, title: e.target.value})} />
            <div className="flex items-center gap-2 pl-2"><span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{lastSaved ? 'Cloud-Sync Active' : 'Initializing...'}</span><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span></div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden md:flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5">
             <button onClick={() => setIsLibraryOpen(true)} className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Archive">📁</button>
             <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Import">📤</button>
             <button onClick={exportJSON} className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Export">📥</button>
          </div>
          <button onClick={() => setIsAiOpen(true)} className="px-4 lg:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95">AI Architect</button>
          <button onClick={() => setIsPreviewMode(true)} className="px-6 lg:px-10 py-2.5 bg-white text-indigo-950 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase shadow-2xl transition-all">PRESENT</button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar slides={presentation.slides} currentIndex={currentSlideIndex} onSelect={setCurrentSlideIndex} onAdd={() => addSlide()} onDelete={deleteSlide} onDuplicate={duplicateSlide} isOpen={isSidebarOpen} />
        <main className="flex-1 overflow-hidden bg-slate-950 p-4 lg:p-12 flex flex-col items-center justify-center relative editor-grid pb-40">
          {currentSlide && (
            <div className="w-full h-full max-w-[98%] max-h-[98%] bg-black rounded-[2rem] lg:rounded-[4rem] shadow-[0_60px_150px_rgba(0,0,0,0.9)] overflow-hidden border border-white/10 relative transition-all duration-700 ease-in-out" style={{ aspectRatio: presentation.aspectRatio.replace(':', ' / '), maxWidth: presentation.aspectRatio === '9:16' ? '450px' : 'none', height: presentation.aspectRatio === '9:16' ? '80vh' : 'auto' }}>
              <EditorCanvas slide={currentSlide} onUpdate={updateSlide} presentationTitle={presentation.title} slideCount={presentation.slides.length} currentIndex={currentSlideIndex} />
            </div>
          )}

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 lg:gap-2 p-3 bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-5xl animate-in slide-in-from-bottom-12 max-w-[90vw] overflow-x-auto scrollbar-hide">
             <div className="hidden sm:flex px-6 border-r border-white/10 mr-2 flex-col shrink-0"><span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em]">Master</span><span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Templates</span></div>
             {[
               { layout: SlideLayout.TITLE, label: 'Title', icon: '📝' },
               { layout: SlideLayout.CONTENT, label: 'Bullets', icon: '📋' },
               { layout: SlideLayout.COMPONENTS, label: 'BOM', icon: '📦' },
               { layout: SlideLayout.SPEC, label: 'Specs', icon: '🛠️' },
               { layout: SlideLayout.TWO_COLUMN, label: 'Dual', icon: '⚖️' },
               { layout: SlideLayout.ACTIVITY, label: 'Lab', icon: '🎯' },
               { layout: SlideLayout.IMAGE, label: 'Media', icon: '🖼️' },
               { layout: SlideLayout.CODE, label: 'Code', icon: '💻' },
               { layout: SlideLayout.QUIZ, label: 'Quiz', icon: '❓' }
             ].map((tpl) => (
               <button key={tpl.layout} onClick={() => addSlide(tpl.layout)} className="flex flex-col items-center gap-1.5 px-3 lg:px-5 py-2.5 hover:bg-white/10 rounded-2xl transition-all group relative shrink-0"><span className="text-xl lg:text-2xl group-hover:scale-125 transition-transform duration-300">{tpl.icon}</span><span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{tpl.label}</span></button>
             ))}
          </div>
        </main>
        {isAiOpen && (
          <AiAssistant onClose={() => setIsAiOpen(false)} onGenerate={(s) => { 
              const newSlide = {...s, id: `ai-${Date.now()}`, background: GRADIENTS[0], animation: 'fade', titleSize: 64, bodySize: 28, fontWeight: 'normal', letterSpacing: 0, contentScale: 1.0, fontFamily: 'font-sans', showSlideNumber: true, slideNumberPosition: 'bottom-right', slideNumberFormat: 'prefix'};
              setPresentation(prev => ({...prev, slides: [...prev.slides, newSlide]}));
              setCurrentSlideIndex(presentation.slides.length);
              setIsAiOpen(false);
          }} />
        )}
        {isLibraryOpen && <LibraryModal onClose={() => setIsLibraryOpen(false)} onSelect={(deck) => { setPresentation(deck); setCurrentSlideIndex(0); setIsLibraryOpen(false); }} onDelete={deleteFromDB} getAll={getAllFromDB} />}
      </div>
    </div>
  );
};

export default App;
