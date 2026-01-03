
import React, { useRef, useState, useEffect } from 'react';
import { Slide, SlideLayout, SlideContent, FONTS, LINE_HEIGHT_OPTIONS, LAYOUT_METADATA, CodeAnimationType } from '../types';
import hljs from 'highlight.js';

interface EditorCanvasProps {
  slide: Slide;
  onUpdate: (slide: Slide) => void;
  presentationTitle: string;
  slideCount: number;
  currentIndex: number;
  readonly?: boolean;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({ slide, onUpdate, presentationTitle, slideCount, currentIndex, readonly = false }) => {
  const bgInputRef = useRef<HTMLInputElement>(null);
  const codeImgInputRef = useRef<HTMLInputElement>(null);
  const rowImageInputRef = useRef<HTMLInputElement>(null);
  const imageSlideInputRef = useRef<HTMLInputElement>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const codeRef = useRef<HTMLElement>(null);
  
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (slide.layout === SlideLayout.CODE && slide.content[0]?.type === 'code' && codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [slide.layout, slide.content]);

  const updateField = (field: keyof Slide, value: any) => {
    if (readonly) return;
    onUpdate({ ...slide, [field]: value });
  };

  const updateContentItem = (id: string, value: string, type: SlideContent['type'] = 'text', label?: string) => {
    if (readonly) return;
    const newContent = [...(slide.content || [])];
    const index = newContent.findIndex(item => item.id === id);
    if (index !== -1) {
      newContent[index] = { ...newContent[index], value, type, label: label !== undefined ? label : newContent[index].label };
    } else {
      newContent.push({ id, type, value, label });
    }
    updateField('content', newContent);
  };

  const processFile = (file: File, target: 'bg' | 'code-img' | 'row-img' | 'image-slide') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (target === 'bg') updateField('backgroundImage', result);
      else if (target === 'code-img') updateContentItem(slide.content[0]?.id || 'code1', result, 'image');
      else if (target === 'image-slide') updateContentItem(slide.content[0]?.id || 'img-asset', result, 'image');
      else if (target === 'row-img' && activeRowId) {
        const item = slide.content.find(i => i.id === activeRowId);
        if (item) {
          try {
            const data = JSON.parse(item.value || '{"img":"","desc":"","qty":""}');
            data.img = result;
            updateContentItem(activeRowId, JSON.stringify(data), 'table-row');
          } catch(e) {
            updateContentItem(activeRowId, result, 'image');
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const updateTableRow = (id: string, field: 'desc' | 'qty', val: string) => {
    const item = slide.content.find(i => i.id === id);
    if (item) {
      const data = JSON.parse(item.value || '{"img":"","desc":"","qty":""}');
      data[field] = val;
      updateContentItem(id, JSON.stringify(data), 'table-row');
    }
  };

  const EditableField = ({ value, onChange, className, style, placeholder }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { 
      if (ref.current && ref.current.innerHTML !== (value || '')) {
        ref.current.innerHTML = value || '';
      }
    }, [value]);
    return (
      <div
        ref={ref}
        contentEditable={!readonly}
        className={`${className} focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:opacity-30 rounded px-1 min-h-[1.2em] transition-all`}
        style={style}
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
      />
    );
  };

  const lineHeightClass = LINE_HEIGHT_OPTIONS.find(opt => opt.value === slide.lineHeight)?.class || 'leading-normal';
  const fontWeightClass = slide.fontWeight === 'bold' ? 'font-bold' : slide.fontWeight === 'black' ? 'font-black' : 'font-normal';
  const trackingStyle = { letterSpacing: `${slide.letterSpacing || 0}px` };
  
  const baseInputClass = `w-full bg-transparent text-white border-none focus:outline-none transition-all ${slide.fontFamily} ${lineHeightClass} ${fontWeightClass}`;
  const contentScale = slide.contentScale || 1.0;

  const renderLayout = () => {
    switch (slide.layout) {
      case SlideLayout.TITLE:
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center gap-12 relative z-10" style={{ transform: `scale(${contentScale})` }}>
            <EditableField className={`${baseInputClass} leading-none text-center`} style={{ fontSize: `${slide.titleSize}px`, ...trackingStyle }} value={slide.title} onChange={(val: string) => updateField('title', val)} placeholder="MODULE HEADING" />
            <div className="h-1.5 w-64 bg-indigo-500 rounded-full" />
            <EditableField className={`${baseInputClass} font-light text-white/50 uppercase text-center`} style={{ fontSize: `${slide.bodySize}px`, letterSpacing: '0.4em' }} value={slide.subtitle} onChange={(val: string) => updateField('subtitle', val)} placeholder="Technical Subtitle" />
          </div>
        );

      case SlideLayout.IMAGE:
        return (
          <div className="flex-1 flex flex-col p-12 overflow-hidden relative z-10 h-full gap-8">
            <div className="shrink-0 flex flex-col gap-3">
               <EditableField className={`${baseInputClass} text-indigo-400 font-black uppercase border-l-8 border-indigo-500/40 pl-10`} style={{ fontSize: `${slide.bodySize * 0.7}px`, letterSpacing: '0.4em' }} value={slide.subtitle} onChange={(val: string) => updateField('subtitle', val)} placeholder="Image Category" />
               <EditableField className={`${baseInputClass} font-black text-white pl-10 leading-tight`} style={{ fontSize: `${slide.titleSize * 0.7}px`, ...trackingStyle }} value={slide.title} onChange={(val: string) => updateField('title', val)} placeholder="ASSET TITLE" />
            </div>
            
            <div className="flex-1 bg-black/40 rounded-[3rem] border border-white/10 overflow-hidden flex items-center justify-center relative group/imgarea" style={{ transform: `scale(${contentScale})`, transformOrigin: 'top center' }}>
               {slide.content[0]?.value ? (
                 <div className="w-full h-full p-4 relative flex items-center justify-center">
                    <img src={slide.content[0].value} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-transform duration-500 group-hover/imgarea:scale-[1.02]" alt="Full Scale Graphic" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/imgarea:opacity-100 transition-all flex items-center justify-center gap-4">
                       <button onClick={() => updateContentItem(slide.content[0].id, '', 'image')} className="bg-red-600/90 p-5 rounded-full hover:scale-110 transition-all shadow-2xl">🗑️</button>
                       <button onClick={() => imageSlideInputRef.current?.click()} className="bg-indigo-600/90 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">Swap Image</button>
                    </div>
                 </div>
               ) : (
                 <button onClick={() => imageSlideInputRef.current?.click()} className="flex flex-col items-center gap-6 text-white/20 hover:text-indigo-400 transition-all p-20 border-4 border-dashed border-white/5 rounded-[4rem]">
                    <span className="text-9xl">📸</span>
                    <span className="text-xs font-black uppercase tracking-[0.5em]">Upload Maximum Real Estate Asset</span>
                 </button>
               )}
            </div>
            <input type="file" ref={imageSlideInputRef} className="hidden" accept="image/*" onChange={(e) => processFile(e.target.files?.[0] as File, 'image-slide')} />
          </div>
        );

      case SlideLayout.COMPONENTS:
        return (
          <div className="flex-1 flex flex-col p-16 overflow-hidden relative z-10 gap-6 h-full">
            <EditableField className={`${baseInputClass} text-emerald-400 font-black uppercase border-l-8 border-emerald-500 pl-10 mb-4`} style={{ fontSize: `${slide.bodySize * 0.8}px`, letterSpacing: '0.3em' }} value={slide.subtitle} onChange={(val: string) => updateField('subtitle', val)} placeholder="BOM INVENTORY" />
            
            <div className="flex-1 bg-slate-900/40 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col" style={{ transform: `scale(${contentScale})`, transformOrigin: 'top center' }}>
              <div className="grid grid-cols-[120px_1fr_120px] bg-emerald-500/20 border-b border-white/10 px-8 py-5">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Image</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-4">Description</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center">Qty</span>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-4">
                {slide.content.filter(i => i.type === 'table-row').map((item) => {
                  const data = JSON.parse(item.value || '{"img":"","desc":"","qty":""}');
                  return (
                    <div key={item.id} className="grid grid-cols-[120px_1fr_120px] items-center bg-white/5 border border-white/5 rounded-2xl px-4 py-4 hover:border-emerald-500/30 transition-all group">
                      <div 
                        onClick={() => { setActiveRowId(item.id); rowImageInputRef.current?.click(); }}
                        className="w-[100px] h-[70px] bg-black/40 rounded-xl overflow-hidden border border-white/10 cursor-pointer flex items-center justify-center relative group-hover:bg-black/60 transition-all"
                      >
                        {data.img ? (
                          <img src={data.img} className="w-full h-full object-cover" alt="Comp" />
                        ) : (
                          <span className="text-xl opacity-20">📸</span>
                        )}
                        <div className="absolute inset-0 bg-emerald-500/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-widest transition-opacity">Swap</div>
                      </div>
                      
                      <div className="pl-6 pr-4">
                        <EditableField 
                          className="text-white/80 font-medium text-sm leading-relaxed" 
                          value={data.desc} 
                          onChange={(v: string) => updateTableRow(item.id, 'desc', v)} 
                          placeholder="Technical description..." 
                        />
                      </div>
                      
                      <div className="flex justify-center">
                        <EditableField 
                          className="w-16 bg-black/20 text-emerald-400 font-black text-center py-2 rounded-lg border border-white/5" 
                          value={data.qty} 
                          onChange={(v: string) => updateTableRow(item.id, 'qty', v)} 
                          placeholder="0" 
                        />
                      </div>
                    </div>
                  );
                })}
                <button 
                  onClick={() => updateField('content', [...(slide.content || []), { id: `row-${Date.now()}`, type: 'table-row', value: JSON.stringify({img:'', desc:'', qty:'1'}) }])} 
                  className="w-full py-6 border-2 border-dashed border-white/5 rounded-3xl text-white/20 hover:text-emerald-400 hover:border-emerald-400/20 transition-all text-[10px] font-black uppercase tracking-[0.4em]"
                >
                  + Add Component Entry
                </button>
              </div>
            </div>
            <input type="file" ref={rowImageInputRef} className="hidden" accept="image/*" onChange={(e) => processFile(e.target.files?.[0] as File, 'row-img')} />
          </div>
        );

      case SlideLayout.SPEC:
        return (
          <div className="flex-1 flex flex-col p-20 overflow-hidden relative z-10 gap-8 h-full">
            <EditableField className={`${baseInputClass} text-emerald-400 font-black uppercase border-l-8 border-emerald-500 pl-10 mb-4`} style={{ fontSize: `${slide.bodySize * 0.8}px`, letterSpacing: '0.3em' }} value={slide.subtitle} onChange={(val: string) => updateField('subtitle', val)} placeholder="Hardware Specifications" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto scrollbar-hide" style={{ transform: `scale(${contentScale})`, transformOrigin: 'top center' }}>
               {slide.content.filter(i => i.type === 'spec-item' || i.type === 'bullet').map((item, idx) => (
                 <div key={item.id} className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 flex flex-col gap-4 group relative hover:border-emerald-500/30 transition-all shadow-xl">
                    <div className="flex justify-between items-start">
                       <EditableField className="text-[10px] font-black text-white/30 uppercase tracking-widest" value={item.label || 'COMPONENT'} onChange={(v: string) => updateContentItem(item.id, item.value, 'spec-item', v)} placeholder="KEY" />
                       <div className={`w-2 h-2 rounded-full animate-pulse ${idx % 3 === 0 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`} />
                    </div>
                    <EditableField className="text-white font-black text-2xl truncate" style={trackingStyle} value={item.value} onChange={(v: string) => updateContentItem(item.id, v, 'spec-item', item.label)} placeholder="Value..." />
                    <div className="mt-auto h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500/40" style={{ width: `${Math.max(20, Math.random() * 100)}%` }} />
                    </div>
                 </div>
               ))}
               <button onClick={() => updateField('content', [...(slide.content || []), { id: `spec-${Date.now()}`, type: 'spec-item', value: 'Ready', label: 'STATUS' }])} className="border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center p-8 text-white/10 hover:text-emerald-400 hover:border-emerald-400/20 transition-all text-sm font-black uppercase tracking-widest">+ ADD SPEC</button>
            </div>
          </div>
        );

      case SlideLayout.CODE:
        const isCodeImage = slide.content[0]?.type === 'image';
        return (
          <div className="flex-1 flex flex-col p-12 overflow-hidden relative z-10 h-full">
            <div className="flex-1 bg-slate-950/95 rounded-[4rem] overflow-hidden shadow-5xl flex flex-col border border-white/10 h-full relative">
              <div className="bg-white/5 px-12 py-5 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex gap-3 items-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500/30"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/30"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-green-500/30"></div>
                  <div className="ml-4 flex bg-white/5 rounded-lg p-0.5">
                    <button 
                      onClick={() => updateContentItem(slide.content[0]?.id || 'code1', slide.content[0]?.value || '', 'code')}
                      className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${!isCodeImage ? 'bg-indigo-600 text-white' : 'text-white/30 hover:text-white'}`}
                    >
                      Code
                    </button>
                    <button 
                      onClick={() => isCodeImage ? codeImgInputRef.current?.click() : updateContentItem(slide.content[0]?.id || 'code1', '', 'image')}
                      className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${isCodeImage ? 'bg-indigo-600 text-white' : 'text-white/30 hover:text-white'}`}
                    >
                      {isCodeImage && slide.content[0]?.value ? 'Swap Img' : 'Image'}
                    </button>
                  </div>
                </div>
                <EditableField className="text-[10px] text-indigo-400 font-black tracking-[0.4em] font-mono uppercase" value={slide.subtitle || 'main.py'} onChange={(val: string) => updateField('subtitle', val)} placeholder="FILENAME" />
              </div>
              
              <div className="flex-1 relative overflow-auto h-full scrollbar-hide">
                <div className="w-full h-full p-4" style={{ transform: `scale(${contentScale})`, transformOrigin: 'top left' }}>
                  {isCodeImage ? (
                    <div className="w-full h-full flex items-center justify-center group/codeimg min-h-[400px]">
                      {slide.content[0]?.value ? (
                        <div className="relative">
                          <img src={slide.content[0].value} className="max-h-full object-contain rounded-2xl shadow-3xl" alt="Logic Visual" />
                          <button onClick={() => updateContentItem(slide.content[0].id, '', 'image')} className="absolute top-4 right-4 bg-red-600/80 p-3 rounded-full opacity-0 group-hover/codeimg:opacity-100 transition-all hover:scale-110">🗑️</button>
                        </div>
                      ) : (
                        <button onClick={() => codeImgInputRef.current?.click()} className="flex flex-col items-center gap-4 text-white/20 hover:text-indigo-400 transition-all">
                          <span className="text-8xl">🖼️</span>
                          <span className="text-[10px] font-black uppercase tracking-[0.5em]">Upload Logic Schematic</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative min-h-full w-full">
                      <textarea 
                        className="absolute inset-0 p-8 bg-transparent text-transparent caret-indigo-400 font-mono border-none focus:outline-none resize-none z-10 overflow-hidden text-2xl leading-relaxed h-full w-full" 
                        spellCheck={false} 
                        value={slide.content && slide.content[0]?.value || ''} 
                        onChange={(e) => updateContentItem((slide.content && slide.content[0]?.id) || 'code1', e.target.value, 'code')} 
                        placeholder="# Robotics Logic..." 
                      />
                      <pre className="p-8 pointer-events-none w-full min-h-full"><code ref={codeRef} className="font-mono whitespace-pre text-2xl leading-relaxed">{(slide.content && slide.content[0]?.value) || ''}</code></pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <input type="file" ref={codeImgInputRef} className="hidden" accept="image/*" onChange={(e) => processFile(e.target.files?.[0] as File, 'code-img')} />
          </div>
        );

      case SlideLayout.QUIZ:
        return (
          <div className="flex-1 flex flex-col p-20 overflow-hidden relative z-10 gap-10" style={{ transform: `scale(${contentScale})` }}>
             <div className="bg-indigo-600/10 border border-indigo-500/20 p-12 rounded-[3.5rem] shadow-4xl text-reveal">
                <EditableField className={`${baseInputClass} text-center text-indigo-100`} style={{ fontSize: `${slide.bodySize * 1.3}px`, ...trackingStyle }} value={slide.content[0]?.value} onChange={(v: string) => updateContentItem(slide.content[0]?.id || 'q', v)} placeholder="Question Title?" />
             </div>
             <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                {(slide.content.filter(i => i.type === 'quiz-option')).map((opt, idx) => (
                  <div key={opt.id} className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl flex items-center gap-6 group hover:bg-white/10 transition-all cursor-pointer">
                     <span className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">{String.fromCharCode(65 + idx)}</span>
                     <EditableField className="flex-1 font-bold text-white/80" style={{ fontSize: `${slide.bodySize * 0.9}px`, ...trackingStyle }} value={opt.value} onChange={(v: string) => updateContentItem(opt.id, v, 'quiz-option')} placeholder={`Solution ${idx+1}`} />
                  </div>
                ))}
             </div>
          </div>
        );

      default:
        const isActivity = slide.layout === SlideLayout.ACTIVITY;
        return (
          <div className="flex-1 flex flex-col p-24 overflow-hidden relative z-10 h-full">
            <EditableField className={`${baseInputClass} text-indigo-400 font-black uppercase border-l-[16px] border-indigo-500/40 pl-12 mb-16 shrink-0`} style={{ fontSize: `${slide.bodySize * 0.8}px`, letterSpacing: '0.4em' }} value={slide.subtitle} onChange={(val: string) => updateField('subtitle', val)} placeholder="Module Segment" />
            <div className="flex flex-col overflow-y-auto pr-10 scrollbar-hide flex-1 pb-24 gap-12" style={{ transform: `scale(${contentScale})`, transformOrigin: 'top center' }}>
              {(slide.content || []).map((item, idx) => (
                <div key={item.id} className="flex items-start group gap-10">
                  <span className="mt-2 text-white/20 font-black shrink-0 text-4xl">{isActivity ? '🎯' : '•'}</span>
                  <EditableField className={`${baseInputClass} flex-1 leading-relaxed drop-shadow-xl`} style={{ fontSize: `${slide.bodySize}px`, ...trackingStyle }} value={item.value} onChange={(val: string) => updateContentItem(item.id, val)} placeholder="Node text..." />
                </div>
              ))}
              {!readonly && <button onClick={() => updateField('content', [...(slide.content || []), { id: `item-${Date.now()}`, type: 'bullet', value: '' }])} className="text-white/10 hover:text-indigo-400 text-[10px] font-black p-6 border-2 border-dashed border-white/5 rounded-3xl transition-all self-start uppercase tracking-widest">+ ADD NODE</button>}
            </div>
          </div>
        );
    }
  };

  const animClass = slide.backgroundAnimation && slide.backgroundAnimation !== 'none' ? `anim-bg-${slide.backgroundAnimation}` : '';

  return (
    <div className={`slide-aspect w-full h-full flex flex-col relative overflow-hidden shadow-5xl group ${slide.fontFamily} editor-grid`}>
      <div className={`absolute inset-0 z-0 transition-all duration-1000 ${slide.background} ${animClass}`}>
        {slide.backgroundImage && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: slide.backgroundSize || 'cover', backgroundPosition: 'center', opacity: (slide.backgroundOpacity || 20) / 100, mixBlendMode: (slide.backgroundBlendMode as any) || 'overlay' }} />}
      </div>

      <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={(e) => processFile(e.target.files?.[0] as File, 'bg')} />

      <header className="h-20 px-12 flex items-center justify-between bg-black/60 backdrop-blur-3xl border-b border-white/10 shrink-0 relative z-40">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-white text-indigo-950 rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl">{LAYOUT_METADATA[slide.layout]?.icon || '📝'}</div>
          <div><EditableField className="text-white font-black uppercase tracking-tighter text-xl leading-none truncate max-w-[450px]" value={slide.title} onChange={(val: string) => updateField('title', val)} placeholder="MODULE" /><p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.5em] mt-1.5">{LAYOUT_METADATA[slide.layout]?.label}</p></div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => updateField('showBanner', !slide.showBanner)} className={`p-3.5 rounded-2xl transition-all border ${slide.showBanner ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}>🏷️</button>
           <button onClick={() => setShowSettings(!showSettings)} className={`p-3.5 rounded-2xl transition-all border ${showSettings ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}>🌍</button>
        </div>

        {showSettings && (
          <div className="absolute top-24 right-12 w-80 bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] z-[100] animate-in slide-in-from-top-4">
            <h4 className="text-[11px] font-black uppercase text-indigo-400 tracking-[0.4em] mb-8 border-b border-white/5 pb-4">Structure Settings</h4>
            <div className="space-y-8 h-full overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
               <div className="flex flex-col gap-4">
                  <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Image Source</span>
                  <button onClick={() => bgInputRef.current?.click()} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black text-white/80 uppercase tracking-[0.2em] transition-all">Swap Map Context</button>
               </div>

               <div className="flex flex-col gap-4">
                  <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Asset Fit</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cover', 'contain', 'auto'] as const).map(fit => (
                      <button 
                        key={fit} 
                        onClick={() => updateField('backgroundSize', fit)} 
                        className={`px-2 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${slide.backgroundSize === fit || (!slide.backgroundSize && fit === 'cover') ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="flex flex-col gap-4">
                  <div className="flex justify-between">
                    <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Letter Spacing</span>
                    <span className="text-[10px] font-mono text-indigo-400">{slide.letterSpacing || 0}px</span>
                  </div>
                  <input 
                    type="range" min="-2" max="20" step="1" 
                    value={slide.letterSpacing || 0} 
                    onChange={(e) => updateField('letterSpacing', parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1 rounded-full appearance-none bg-white/10"
                  />
               </div>

               <div className="flex flex-col gap-4">
                  <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Line Height</span>
                  <div className="grid grid-cols-3 gap-2">
                    {LINE_HEIGHT_OPTIONS.map(opt => (
                      <button 
                        key={opt.value} 
                        onClick={() => updateField('lineHeight', opt.value)} 
                        className={`px-2 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${slide.lineHeight === opt.value ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="flex flex-col gap-5">
                  <span className="text-[9px] font-black uppercase text-white/20 tracking-widest">Physics Dynamics</span>
                  <div className="grid grid-cols-2 gap-2">
                    {['none', 'pulse', 'float', 'zoom-slow', 'pan-slow', 'spin-slow'].map(anim => (
                      <button key={anim} onClick={() => updateField('backgroundAnimation', anim)} className={`px-2 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${slide.backgroundAnimation === anim ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'}`}>{anim}</button>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}
      </header>

      {renderLayout()}

      {/* TYPOGRAPHY TOOLBAR */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 p-3 bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all shadow-5xl translate-y-4 group-hover:translate-y-0 duration-300">
         
         <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <span className="text-[8px] font-black text-white/20 uppercase vertical-text tracking-widest mr-1">Title</span>
            <button onClick={() => updateField('titleSize', Math.max(12, (slide.titleSize || 64) - 4))} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center font-black text-[10px] text-white/60 transition-all">-</button>
            <span className="text-[10px] font-mono text-indigo-400 font-bold w-6 text-center">{slide.titleSize}</span>
            <button onClick={() => updateField('titleSize', (slide.titleSize || 64) + 4)} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center font-black text-[10px] text-white/60 transition-all">+</button>
         </div>

         <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <span className="text-[8px] font-black text-white/20 uppercase vertical-text tracking-widest mr-1">Body</span>
            <button onClick={() => updateField('bodySize', Math.max(10, (slide.bodySize || 28) - 2))} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center font-black text-[10px] text-white/60 transition-all">-</button>
            <span className="text-[10px] font-mono text-indigo-400 font-bold w-6 text-center">{slide.bodySize}</span>
            <button onClick={() => updateField('bodySize', (slide.bodySize || 28) + 2)} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center font-black text-[10px] text-white/60 transition-all">+</button>
         </div>

         <div className="flex items-center gap-1 border-r border-white/10 pr-4">
            {(['normal', 'bold', 'black'] as const).map(weight => (
              <button 
                key={weight}
                onClick={() => updateField('fontWeight', weight)}
                className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${slide.fontWeight === weight ? 'bg-indigo-600 text-white' : 'text-white/20 hover:text-white/40'}`}
              >
                {weight.slice(0, 1)}
              </button>
            ))}
         </div>

         <div className="flex items-center gap-4 border-r border-white/10 pr-4">
            <input 
              type="range" 
              min="0.4" 
              max="2.0" 
              step="0.05" 
              value={contentScale} 
              onChange={(e) => updateField('contentScale', parseFloat(e.target.value))}
              className="w-24 accent-indigo-500 bg-white/10 h-1 rounded-full appearance-none cursor-pointer" 
            />
            <span className="text-[10px] font-mono text-white/40">{Math.round(contentScale * 100)}%</span>
         </div>

         <div className="flex items-center gap-3">
            <select 
              className="bg-transparent text-[9px] font-black uppercase text-white/50 focus:outline-none cursor-pointer hover:text-white transition-colors"
              value={slide.fontFamily}
              onChange={(e) => updateField('fontFamily', e.target.value)}
            >
              {FONTS.map(f => <option key={f.class} value={f.class} className="bg-slate-900">{f.name}</option>)}
            </select>
            <div className="flex gap-1">
               {['left', 'center', 'right'].map(align => (
                 <button 
                   key={align} 
                   onClick={() => updateField('titleAlign', align)} 
                   className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${slide.titleAlign === align ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-white/5 text-white/20'}`}
                 >
                   <span className="text-[10px]">{align === 'left' ? '⌷' : align === 'center' ? '⌸' : '⌷'}</span>
                 </button>
               ))}
            </div>
         </div>
      </div>
      <style>{`
        .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 7px; }
      `}</style>
    </div>
  );
};

export default EditorCanvas;
