import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const CompactMarketIndicators = ({ fearGreedData, macroData, volatilityData }) => {
  const getTrendIcon = (value, threshold = 0) => {
    if (value === null || value === undefined) return null;
    if (value > threshold) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    }
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(1);
  };

  // If all data is null, don't render anything
  if (!fearGreedData && !macroData && !volatilityData) return null;

  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg text-xs">
      <div className="text-center">
        <div className="text-gray-500 mb-1">Fear & Greed</div>
        <div className="font-bold text-sm">{fearGreedData?.value || 'N/A'}</div>
      </div>

      <div className="text-center">
        <div className="text-gray-500 mb-1">M2 YoY</div>
        <div className="flex items-center justify-center">
          {macroData ? (
            <>
              <span className="font-medium">{formatNumber(macroData.yearChange)}%</span>
              {getTrendIcon(macroData.yearChange)}
            </>
          ) : 'N/A'}
        </div>
      </div>

      <div className="text-center">
        <div className="text-gray-500 mb-1">Crypto Vol</div>
        <div className="flex items-center justify-center">
          {volatilityData?.crypto ? (
            <>
              <span className="font-medium">{formatNumber(volatilityData.crypto.current)}</span>
              {getTrendIcon(volatilityData.crypto.current, volatilityData.crypto.historicalMean)}
            </>
          ) : 'N/A'}
        </div>
      </div>

      <div className="text-center">
        <div className="text-gray-500 mb-1">VIX</div>
        <div className="flex items-center justify-center">
          {volatilityData?.vix ? (
            <>
              <span className="font-medium">{formatNumber(volatilityData.vix.current)}</span>
              {getTrendIcon(volatilityData.vix.current, 20)}
            </>
          ) : 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default CompactMarketIndicators;