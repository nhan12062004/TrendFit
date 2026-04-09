import React from 'react';

export default function LoadingScreen({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={`flex items-center justify-center w-full ${fullScreen ? 'h-screen' : 'h-full min-h-[400px]'} bg-bg-primary transition-all duration-300`}>
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#a3e635]"></div>
        <div className="absolute inset-0 animate-pulse bg-[#a3e635]/10 rounded-full blur-xl"></div>
      </div>
    </div>
  );
}
