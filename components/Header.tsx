
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-secondary via-[#1a2329] to-black border-b-2 border-primary sticky top-0 z-50 shadow-xl">
      <div className="container mx-auto px-4 py-3 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
        <div className="flex items-center space-x-3 w-full md:w-auto justify-center md:justify-start">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center justify-center bg-white rounded-xl p-1 shadow-lg">
              <img src="/logo_white.png" alt="Dr Paul's Logo" className="h-8 md:h-12 w-auto object-contain" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-2xl font-extrabold text-white tracking-tight font-poppins leading-tight">
              Dr Paul's <span className="text-primary">Hair Transplant</span>
            </span>
            <span className="text-[10px] md:text-xs font-bold text-accent uppercase tracking-[0.3em] font-poppins">
              AI Simulation Suite
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-sm font-bold text-white/90 font-poppins">
          <div className="hidden sm:flex items-center px-4 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></span>
            <span className="text-[10px] md:text-xs uppercase tracking-wider">Clinical AI Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
