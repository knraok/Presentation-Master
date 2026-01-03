
import React, { useState, useEffect } from 'react';
import { Presentation, LAYOUT_METADATA } from '../types';

interface LibraryModalProps {
  onClose: () => void;
  onSelect: (deck: Presentation) => void;
  onDelete: (id: string) => Promise<any>;
  getAll: () => Promise<Presentation[]>;
}

const LibraryModal: React.FC<LibraryModalProps> = ({ onClose, onSelect, onDelete, getAll }) => {
  const [decks, setDecks] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    setLoading(true);
    const saved = await getAll();
    setDecks(saved.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    }));
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Permanently delete this presentation deck?")) {
      await onDelete(id);
      loadDecks();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-5xl h-[80vh] flex flex-col shadow-5xl overflow-hidden">
        <header className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tighter">STEM Project Library</h2>
            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.3em] mt-1">Stored Locally in Browser Architecture</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center text-2xl transition-all">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {loading ? (
            <div className="h-full flex items-center justify-center text-white/20 font-black uppercase tracking-widest animate-pulse">Scanning Database...</div>
          ) : decks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <span className="text-8xl mb-6 opacity-10">📁</span>
              <p className="text-white/20 font-black uppercase tracking-[0.4em]">No Saved Presentations Found</p>
              <button onClick={onClose} className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">Create Your First Deck</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map(deck => (
                <div 
                  key={deck.id} 
                  onClick={() => onSelect(deck)}
                  className="group bg-white/[0.03] border border-white/5 rounded-3xl p-6 cursor-pointer hover:bg-white/[0.06] hover:border-white/20 transition-all relative flex flex-col gap-4 overflow-hidden"
                >
                  <div className={`aspect-video rounded-2xl ${deck.slides[0]?.background || 'bg-slate-800'} flex items-center justify-center relative shadow-lg`}>
                    <span className="text-4xl opacity-40">{LAYOUT_METADATA[deck.slides[0]?.layout]?.icon || '📝'}</span>
                    <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black text-white/80 border border-white/10 uppercase tracking-widest">
                      {deck.slides.length} Slides
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white truncate mb-1">{deck.title || 'Untitled Project'}</h3>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Updated: {deck.updatedAt || 'Unknown'}</p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={(e) => handleDelete(e, deck.id)} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                      Delete
                    </button>
                    <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                      Open Deck
                    </button>
                  </div>
                  
                  {/* Decorative ID Background */}
                  <span className="absolute -bottom-4 -right-4 text-[40px] font-black opacity-[0.03] select-none pointer-events-none uppercase">{deck.id.slice(0,4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="p-6 bg-black/40 border-t border-white/5 shrink-0 flex items-center justify-center">
          <p className="text-white/10 text-[9px] font-black uppercase tracking-[0.5em]">STEM Library Engine v3.0 // Multi-Tenant Storage Protocol</p>
        </footer>
      </div>
    </div>
  );
};

export default LibraryModal;
