
import React, { useEffect, useRef } from 'react';
import { Slide } from '../types';

interface ScriptEditorProps {
  isOpen: boolean;
  onToggle: () => void;
  slide: Slide;
  onUpdate: (notes: string) => void;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ isOpen, onToggle, slide, onUpdate }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      textAreaRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div 
      className={`
        fixed bottom-14 right-8 w-96 bg-white shadow-2xl rounded-2xl border border-slate-200 transition-all duration-300 z-40
        ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}
      `}
      role="complementary"
      aria-label="Speaker script editor"
      aria-hidden={!isOpen}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
           <span className="text-lg" aria-hidden="true">📜</span> Speaker Script
        </h3>
        <button 
          onClick={onToggle} 
          className="text-slate-400 hover:text-slate-600 focus:text-slate-800 outline-none text-2xl"
          aria-label="Close script panel"
        >
          ×
        </button>
      </div>
      <div className="p-4">
        <textarea 
          ref={textAreaRef}
          className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
          placeholder="Type what you want to say during this slide..."
          value={slide.notes}
          onChange={(e) => onUpdate(e.target.value)}
          aria-label="Speaker notes content"
        />
        <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
           <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider mb-1" aria-hidden="true">Pro Tip</p>
           <p className="text-xs text-indigo-600">Use this script to stay on track. This won't be visible to your audience during the presentation.</p>
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;
