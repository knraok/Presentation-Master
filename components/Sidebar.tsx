
import React, { useState, useEffect } from 'react';
import { Slide, LAYOUT_METADATA, SlideLayout } from '../types';

interface SidebarProps {
  slides: Slide[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ slides, currentIndex, onSelect, onAdd, onDelete, onDuplicate, isOpen }) => {
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());

  // Automatically expand the current slide if it's not already
  useEffect(() => {
    if (slides[currentIndex]) {
      setExpandedSlides(prev => new Set(prev).add(slides[currentIndex].id));
    }
  }, [currentIndex, slides]);

  if (!isOpen) return null;

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedSlides);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedSlides(next);
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'bullet': return '•';
      case 'code': return '{ }';
      case 'spec-item': return '≡';
      case 'quiz-option': return '?';
      case 'image': return '🖼';
      case 'video': return '▶';
      default: return '○';
    }
  };

  return (
    <aside className="fixed lg:relative inset-y-0 left-0 w-72 lg:w-80 border-r border-white/10 bg-slate-900/95 backdrop-blur-2xl flex flex-col h-full shrink-0 z-[45] transition-all shadow-[40px_0_100px_rgba(0,0,0,0.4)] overflow-hidden" aria-label="Deck Map">
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-800/20 gap-4">
        <div>
          <h3 className="font-black text-white/40 text-[10px] uppercase tracking-[0.4em]">Project Outline</h3>
          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">{slides.length} NODES ACTIVE</p>
        </div>
        <button 
          onClick={() => onAdd()}
          className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-500 transition-all shadow-indigo-500/20 shadow-2xl active:scale-95 text-2xl font-black"
        >
          +
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
        {slides.map((slide, index) => {
          const isExpanded = expandedSlides.has(slide.id);
          const isSelected = index === currentIndex;
          
          return (
            <div key={slide.id} className="flex flex-col gap-1">
              {/* Slide Parent Node */}
              <div 
                onClick={() => onSelect(index)}
                className={`
                  group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border
                  ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg' : 'hover:bg-white/5 border-transparent'}
                `}
              >
                <button 
                  onClick={(e) => toggleExpand(slide.id, e)}
                  className={`w-5 h-5 flex items-center justify-center text-[10px] text-white/20 hover:text-white transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                >
                  ▶
                </button>
                
                <div className={`w-10 h-7 rounded-lg flex items-center justify-center shrink-0 text-lg relative overflow-hidden ${slide.background} ${isSelected ? 'ring-2 ring-indigo-400' : ''}`}>
                  {slide.backgroundImage && <div className="absolute inset-0 opacity-10 bg-center bg-cover" style={{backgroundImage: `url(${slide.backgroundImage})`}} />}
                  <span className="relative z-10 scale-75">{LAYOUT_METADATA[slide.layout]?.icon || '📝'}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={`text-[10px] font-black uppercase tracking-wider truncate ${isSelected ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                    {slide.title?.replace(/<[^>]*>?/gm, '') || 'UNNAMED MODULE'}
                  </h4>
                  <p className="text-[7px] font-bold text-white/20 uppercase tracking-[0.2em]">{index + 1} / {LAYOUT_METADATA[slide.layout]?.label}</p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex gap-1 items-center transition-all">
                   <button onClick={(e) => { e.stopPropagation(); onDuplicate(slide.id); }} className="p-1.5 hover:bg-white/10 rounded-lg text-[10px]" title="Duplicate">📋</button>
                   <button onClick={(e) => { e.stopPropagation(); onDelete(slide.id); }} className="p-1.5 hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 rounded-lg text-[10px]" title="Delete">🗑️</button>
                </div>
              </div>

              {/* Collapsible Children Blocks */}
              {isExpanded && slide.content && slide.content.length > 0 && (
                <div className="ml-6 pl-4 border-l border-white/5 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  {slide.content.map((item, itemIdx) => {
                    // Only show items with actual values
                    if (!item.value) return null;
                    const truncatedValue = item.value.replace(/<[^>]*>?/gm, '').substring(0, 24);
                    
                    return (
                      <div 
                        key={item.id}
                        onClick={() => onSelect(index)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group/item"
                      >
                        <span className="text-[8px] font-black text-indigo-500/50 group-hover/item:text-indigo-400 shrink-0 min-w-[12px] text-center">
                          {getContentIcon(item.type)}
                        </span>
                        <span className="text-[9px] font-medium text-white/30 group-hover/item:text-white/60 truncate leading-none pt-0.5">
                          {truncatedValue || 'Empty block'}
                        </span>
                        {item.label && (
                          <span className="text-[7px] font-black text-white/10 uppercase bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                            {item.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="h-24" />
      </div>
      
      {/* Visual Indicator of Connection Status */}
      <div className="p-6 bg-black/40 border-t border-white/5 flex items-center gap-3">
         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
         <span className="text-[8px] font-black uppercase text-white/20 tracking-[0.3em]">HIEARCHY MONITOR ACTIVE</span>
      </div>
    </aside>
  );
};

export default Sidebar;
