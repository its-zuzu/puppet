import React from 'react';

export const Button = ({ children, onClick, variant, size, className }: any) => {
  const baseStyles = "inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0";
  
  if (variant === 'primary') {
    return (
      <button 
        onClick={onClick} 
        className={`${baseStyles} bg-[#A855F7] text-[#F9FAFB] shadow-[0_18px_40px_rgba(168,85,247,0.28)] hover:bg-[#9333EA] ${className}`}
      >
        {children}
      </button>
    );
  }
  
  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} border border-[#2E1065] bg-[#000000]/40 text-[#F9FAFB] backdrop-blur-xl hover:bg-[#3B0764]/70 ${className}`}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className }: any) => (
  <div className={`${className} bg-[#3B0764]/45 border border-[#2E1065] rounded-2xl backdrop-blur-xl`}>
    {children}
  </div>
);

export const CardBody = ({ children, className }: any) => (
  <div className={`${className} p-6`}>
    {children}
  </div>
);
