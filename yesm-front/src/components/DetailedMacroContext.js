import React from 'react';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DetailedMacroContext = ({ data }) => {
  if (!data) return null;

  const {
    currentValue,
    threeMonthChange,
    yearChange,
    avgMonthlyGrowth,
    observations
  } = data;

  const formatTrend = (value) => {
    const formatted = value.toFixed(1);
    const isPositive = value > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className="flex items-center gap-1">
        <span className={`${color} text-sm`}>{formatted}%</span>
        <Icon className={`${color} h-4 w-4`} />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
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
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">3M Change</div>
          {formatTrend(threeMonthChange)}
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">1Y Change</div>
          {formatTrend(yearChange)}
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Avg Monthly</div>
          {formatTrend(avgMonthlyGrowth)}
        </div>
      </div>

      <div className="h-64 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={observations}>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short' })}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tick={{ fontSize: 12 }}
              width={80}
              tickFormatter={(value) => `$${(value/1000).toFixed(1)}T`}
            />
            <Tooltip 
              formatter={(value) => [`$${(value/1000).toFixed(1)}T`, 'M2']}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#4A0E4E"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-sm text-gray-600 mt-4 p-4 bg-gray-50 rounded-lg">
        <span className="font-medium">Analysis:</span> {yearChange > 5 ? 
          "Expansionary monetary conditions suggest potential inflationary pressures. Consider this context for asset valuations." :
          yearChange < 0 ? 
          "Contractionary monetary conditions indicate tighter liquidity. This may impact asset prices and market sentiment." :
          "Moderate monetary growth suggests stable conditions, though continue monitoring for changes."
        }
      </div>
    </div>
  );
};

export default DetailedMacroContext;