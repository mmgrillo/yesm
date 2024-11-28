
import React from 'react';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MacroContext = ({ data, size = 'normal' }) => {
  if (!data) return null;

  const {
    currentValue,
    threeMonthChange,
    yearChange,
    avgMonthlyGrowth,
    observations
  } = data;

  const formatTrend = (value) => {
    if (value === undefined || value === null) {
      return <span className="text-gray-500">N/A</span>;
    }
    
    const formatted = Number(value).toFixed(2);
    const isPositive = value > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className="flex items-center gap-1">
        <span className={color}>{formatted}%</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
    );
  };
 

  const containerClass = size === 'small' 
    ? 'p-4 space-y-2' 
    : 'p-6 space-y-4';

  return (
    <div className={`bg-white rounded-lg shadow ${containerClass}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          M2 Money Supply
          <button className="group relative">
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
              M2 is a measure of the money supply that includes cash, checking deposits, and easily convertible near money. Changes in M2 can indicate future inflation and economic activity.
            </div>
          </button>
        </h3>
        <div className="text-xl font-bold text-gray-700">
          ${(currentValue / 1000).toFixed(1)}T
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 my-4">
        <div className="text-center">
          <div className="text-sm text-gray-600">3M Change</div>
          {formatTrend(threeMonthChange)}
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">1Y Change</div>
          {formatTrend(yearChange)}
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">Avg Monthly</div>
          {formatTrend(avgMonthlyGrowth)}
        </div>
      </div>

      {size !== 'small' && (
        <div className="h-40 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={observations}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                width={60}
              />
              <Tooltip 
                formatter={(value) => [`$${(value/1000).toFixed(1)}T`, 'M2']}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#4A0E4E"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="text-sm text-gray-500 mt-2">
        {size === 'small' ? (
          <div className="text-center">
            Click for detailed view
          </div>
        ) : (
          <div>
            Interpretation: {yearChange > 5 ? 
              "Expansionary monetary conditions - watch for inflation" :
              yearChange < 0 ? 
              "Contractionary monetary conditions - potential deflationary pressure" :
              "Moderate monetary growth"
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default MacroContext;