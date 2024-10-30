import React from 'react';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <svg width="100" height="100" viewBox="0 0 50 50" className="animate-spin text-[#4A0E4E]">
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        d="M26.5 3a1.5 1.5 0 10-3 0v9.25a1.5 1.5 0 003 0V3zm0 38.5a1.5 1.5 0 10-3 0v9.25a1.5 1.5 0 003 0V41.5z"
        className="opacity-75"
      />
    </svg>
    <p className="ml-4 text-xl text-[#4A0E4E] font-semibold">Fetching crypto assets...</p>
  </div>
);

export default LoadingSpinner;
