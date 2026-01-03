
import React from 'react';

const Header: React.FC = () => {
  return (
    <div className="flex items-center gap-3">
       <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <span className="text-white font-black text-xl">S</span>
       </div>
       <div>
          <h1 className="font-bold text-slate-800 tracking-tight leading-none">STEM Robotics</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Presentation Suite</p>
       </div>
    </div>
  );
};

export default Header;
