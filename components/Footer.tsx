
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-xs text-slate-400">
      <div className="flex items-center gap-4">
        <span>© 2024 STEM Robotics AI</span>
        <span className="w-1 h-1 bg-slate-200 rounded-full" />
        <span>V 2.0.4</span>
      </div>
      <div className="flex items-center gap-2">
         <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
         <span className="font-medium text-slate-500">Auto-save active</span>
      </div>
    </footer>
  );
};

export default Footer;
