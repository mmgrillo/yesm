import React from 'react';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ChartCard = ({ title, data, dataKey, tooltip, color = "#4A0E4E" }) => (
  <div className="h-48">
    <div className="flex items-center gap-2 mb-2">
      <h4 className="font-medium text-gray-700">{title}</h4>
      <button className="group relative">
        <Info className="h-4 w-4 text-gray-400" />
        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {tooltip}
        </div>
      </button>
    </div>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 10 }}
          tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short' })}
        />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip 
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
        />
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const DetailedMarketIndicators = ({ fearGreedData, macroData, volatilityData }) => {
  if (!fearGreedData && !macroData && !volatilityData) return null;

  const formatNumber = (num) => {
    return typeof num === 'number' ? num.toFixed(1) : 'N/A';
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Market Context</h3>
      
      <div className="grid grid-cols-4 gap-4">
        {/* Fear & Greed */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Fear & Greed Index</div>
            <div className="text-2xl font-bold" style={{
              color: fearGreedData?.value > 50 ? '#2ecc71' : '#e74c3c'
            }}>
              {fearGreedData?.value || 'N/A'}
            </div>
            <div className="text-sm text-gray-500">
              {fearGreedData?.value >= 75 ? 'Extreme Greed' :
               fearGreedData?.value >= 55 ? 'Greed' :
               fearGreedData?.value >= 45 ? 'Neutral' :
               fearGreedData?.value >= 25 ? 'Fear' :
               'Extreme Fear'}
            </div>
          </div>
        </div>

        {/* M2 Money Supply */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">M2 YoY Change</div>
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {formatNumber(macroData?.yearChange)}%
              {macroData?.yearChange > 0 ? 
                <TrendingUp className="h-5 w-5 text-green-500" /> :
                <TrendingDown className="h-5 w-5 text-red-500" />
              }
            </div>
            <div className="text-sm text-gray-500">
              Avg Monthly: {formatNumber(macroData?.avgMonthlyGrowth)}%
            </div>
          </div>
        </div>

        {/* Crypto Volatility */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Crypto Volatility</div>
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {formatNumber(volatilityData?.crypto?.current)}
              {volatilityData?.crypto?.current > volatilityData?.crypto?.historicalMean ? 
                <TrendingUp className="h-5 w-5 text-red-500" /> :
                <TrendingDown className="h-5 w-5 text-green-500" />
              }
            </div>
            <div className="text-sm text-gray-500">
              Mean: {formatNumber(volatilityData?.crypto?.historicalMean)}
            </div>
          </div>
        </div>

        {/* VIX */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">VIX Index</div>
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {formatNumber(volatilityData?.vix?.current)}
              {volatilityData?.vix?.current > 20 ? 
                <TrendingUp className="h-5 w-5 text-red-500" /> :
                <TrendingDown className="h-5 w-5 text-green-500" />
              }
            </div>
            <div className="text-sm text-gray-500">
              Mean: {formatNumber(volatilityData?.vix?.historicalMean)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <ChartCard 
          title="M2 Money Supply Trend"
          data={macroData?.observations || []}
          dataKey="value"
          tooltip="Monthly M2 money supply values showing monetary conditions"
        />
        
        <ChartCard 
          title="Market Volatility Comparison"
          data={volatilityData?.vix?.historical || []}
          dataKey="value"
          tooltip="VIX index showing market volatility expectations"
          color="#e74c3c"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <strong>Market Analysis:</strong> {' '}
        {macroData?.yearChange > 5 && volatilityData?.vix?.current > 20 
          ? "High monetary growth and market volatility suggest cautious conditions"
          : macroData?.yearChange < 0 && volatilityData?.vix?.current > 20
          ? "Tightening monetary conditions with elevated market stress"
          : "Moderate market conditions with normal volatility levels"
        }
      </div>
    </div>
  );
};

export default DetailedMarketIndicators;