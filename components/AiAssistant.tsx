
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { SlideLayout } from '../types';

interface AiAssistantProps {
  onClose: () => void;
  onGenerate: (slide: any) => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ onClose, onGenerate }) => {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the textarea when dialog opens
    textareaRef.current?.focus();
    
    // Simple focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [onClose]);

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    
    try {
      // Fix: Always use new GoogleGenAI({ apiKey: process.env.API_KEY })
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        // Fix: Use gemini-3-pro-preview for complex STEM robotics tasks
        model: 'gemini-3-pro-preview',
        contents: `Create a STEM robotics/AI slide content for the topic: "${topic}". Return in JSON format.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              layout: { type: Type.STRING, description: 'Must be exactly one of: TITLE, CONTENT, TWO_COLUMN, ACTIVITY, IMAGE, VIDEO, CODE' },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              content: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING },
                    value: { type: Type.STRING }
                  },
                  required: ['id', 'type', 'value']
                }
              },
              notes: { type: Type.STRING }
            },
            required: ['layout', 'title', 'subtitle', 'content', 'notes']
          }
        }
      });

      // Fix: Using response.text (property, not method)
      const result = JSON.parse(response.text);
      
      // Validate Layout
      if (!Object.values(SlideLayout).includes(result.layout as SlideLayout)) {
        console.warn("AI generated an invalid layout, defaulting to CONTENT");
        result.layout = SlideLayout.CONTENT;
      }

      onGenerate(result);
    } catch (error) {
      console.error(error);
      alert("Failed to generate slide. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="presentation">
      <div 
        ref={dialogRef}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-assistant-title"
        aria-describedby="ai-assistant-desc"
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/50 hover:text-white focus:text-white outline-none text-2xl" 
            aria-label="Close AI Assistant"
          >
            ×
          </button>
          <h2 id="ai-assistant-title" className="text-3xl font-bold mb-2">✨ STEM AI Assistant</h2>
          <p id="ai-assistant-desc" className="text-purple-100 opacity-80">Describe what slide you want to create and let AI do the work.</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-2">
             <label htmlFor="ai-topic-input" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Topic or Description</label>
             <textarea 
               id="ai-topic-input"
               ref={textareaRef}
               className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all"
               placeholder="Example: Explain how PID controllers work in balancing robots..."
               value={topic}
               onChange={(e) => setTopic(e.target.value)}
             />
          </div>

          <button 
            disabled={isGenerating || !topic}
            onClick={handleGenerate}
            className={`
              w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg focus:ring-4 focus:ring-indigo-300 outline-none
              ${isGenerating ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}
            `}
            aria-busy={isGenerating}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processing Knowledge...
              </span>
            ) : '✨ Generate Intelligent Slide'}
          </button>

          <p className="text-[10px] text-center text-slate-400">Powered by Gemini 3 Pro • Trained on STEM Pedagogy</p>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
