// components/FearGreedGauge.js
import React from 'react';
import { Info } from 'lucide-react';

const FearGreedGauge = ({ value, timestamp, size = 'normal' }) => {
  // Calculate the rotation angle based on the value (0-100)
  const angle = (value / 100) * 180 - 90;

  // Get the sentiment based on the value
  const getSentiment = (value) => {
    if (value >= 0 && value <= 25) return { text: 'Extreme Fear', color: '#e74c3c' };
    if (value <= 45) return { text: 'Fear', color: '#e67e22' };
    if (value <= 55) return { text: 'Neutral', color: '#f1c40f' };
    if (value <= 75) return { text: 'Greed', color: '#2ecc71' };
    return { text: 'Extreme Greed', color: '#27ae60' };
  };

  const sentiment = getSentiment(value);
  
  const gaugeSize = size === 'small' ? 'w-20 h-12' : 'w-32 h-20';
  const textSize = size === 'small' ? 'text-xs' : 'text-sm';
  const valueSize = size === 'small' ? 'text-lg' : 'text-2xl';

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 mb-1">
        <span className={`font-medium ${textSize}`}>Fear & Greed Index</span>
        <button className="group relative">
          <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
            The Fear & Greed Index measures market sentiment. Extreme fear indicates potential buying opportunities, while extreme greed suggests the market might be due for a correction.
          </div>
        </button>
      </div>
      
      <div className={`relative ${gaugeSize}`}>
        <div className="absolute inset-0 h-full overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-t-full" />
        </div>
        
        <div 
          className="absolute bottom-0 left-1/2 origin-bottom transform -translate-x-1/2 w-1 bg-gray-800 transition-transform duration-500"
          style={{ 
            height: size === 'small' ? '10px' : '16px',
            transform: `translateX(-50%) rotate(${angle}deg)`
          }}
        />
      </div>

      <div className="text-center mt-2">
        <div className={`font-bold ${valueSize}`} style={{ color: sentiment.color }}>
          {value}
        </div>
        <div className={`${textSize} text-gray-600`}>{sentiment.text}</div>
        <div className={`${textSize} text-gray-500`}>
          {new Date(timestamp * 1000).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default FearGreedGauge;