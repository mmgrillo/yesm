import React from 'react';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { getSupportedImplementation } from '../utils/tokenUtils';

const TransactionCard = ({ transaction, tokenPrices, navigate, onUndoChange }) => {
  const { transactionNumber, operation_type: action, attributes } = transaction;

  if (!attributes) return null; 

  // Helper function to get current price from tokenPrices
  const getCurrentPrice = (chain, address, symbol) => {
    const priceKey = symbol.toLowerCase() === 'eth' ? 'ethereum:eth' : `${chain}:${address || symbol.toLowerCase()}`;
    return tokenPrices[priceKey]?.usd || 'N/A';
  };

  // Aggregate all sold and bought transfers
  const soldTransfers = attributes.transfers.filter(t => t.direction === 'out');
  const boughtTransfers = attributes.transfers.filter(t => t.direction === 'in');

  // Calculate total sold values
  const totalSoldValue = soldTransfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);
  const totalSoldUSD = soldTransfers.reduce((sum, t) => sum + (t.price * (t.quantity?.float || 0)), 0);
  const soldSymbol = soldTransfers[0]?.fungible_info?.symbol?.toUpperCase() || 'N/A';
  const soldImplementation = getSupportedImplementation(soldTransfers[0]?.fungible_info);
  const currentSoldPrice = soldImplementation
    ? getCurrentPrice(soldImplementation.chain_id, soldImplementation.address, soldSymbol)
    : 'N/A';

  const totalSoldQuantity = soldTransfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);
  const totalBoughtQuantity = boughtTransfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);
  


  // Calculate total bought values
  const totalBoughtValue = boughtTransfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);
  const totalBoughtUSD = boughtTransfers.reduce((sum, t) => sum + (t.price * (t.quantity?.float || 0)), 0);
  const boughtSymbol = boughtTransfers[0]?.fungible_info?.symbol?.toUpperCase() || 'N/A';
  const boughtImplementation = getSupportedImplementation(boughtTransfers[0]?.fungible_info);
  const currentBoughtPrice = boughtImplementation
    ? getCurrentPrice(boughtImplementation.chain_id, boughtImplementation.address, boughtSymbol)
    : 'N/A';

  const soldPerformance = totalSoldUSD !== 0 && currentSoldPrice !== 'N/A'
  ? ((totalSoldQuantity * currentSoldPrice - totalSoldUSD) / totalSoldUSD) * 100
  : 'N/A';

  const boughtPerformance = totalBoughtUSD !== 0 && currentBoughtPrice !== 'N/A'
  ? ((totalBoughtQuantity * currentBoughtPrice - totalBoughtUSD) / totalBoughtUSD) * 100
  : 'N/A';

  const calculateRelativePerformanceIndex = (soldPerformance, boughtPerformance) => {
    if (soldPerformance === 'N/A' || boughtPerformance === 'N/A') {
      return 'N/A';
    }
  
    const relativePerformance = (parseFloat(boughtPerformance) - parseFloat(soldPerformance)) / 100;
    return (relativePerformance * 100).toFixed(2); // Return as a percentage
  };
  
  const rpi = calculateRelativePerformanceIndex(soldPerformance, boughtPerformance);

   // Helper function to format large numbers
   const formatNumber = (num, maxDecimals = 4) => {
    if (typeof num !== 'number') return 'N/A';
    
    // For very small numbers (like crypto amounts), show more decimals
    if (Math.abs(num) < 0.0001) {
      return num.toExponential(2);
    }
    
    // For regular numbers, limit decimals
    return num.toLocaleString(undefined, {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: 2
    });
  };


  // Handle Undo Checkbox
  const handleUndoChange = (e) => {
    onUndoChange(transaction, e.target.checked);
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 mb-4 w-full hover:shadow-xl transition-shadow duration-300">
      {/* Top Section Divided into RPI and USD Gained */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* RPI Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-600 font-medium">RPI</span>
            <button className="group relative">
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                The Relative Performance Index (RPI) compares the performance of bought vs. sold assets. Positive RPI indicates outperformance.
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {rpi !== 'N/A' ? `${formatNumber(parseFloat(rpi), 2)}%` : 'N/A'}
            </span>
            {rpi !== 'N/A' && parseFloat(rpi) !== 0 && (
              parseFloat(rpi) > 0 
                ? <TrendingUp className="h-5 w-5 text-green-500" />
                : <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>
  
        {/* USD Gained Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-medium mb-1">USD Gained</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold truncate">
              {boughtPerformance !== 'N/A' 
                ? `$${formatNumber(totalBoughtValue * currentBoughtPrice - totalBoughtUSD, 2)}` 
                : 'N/A'}
            </span>
            {boughtPerformance !== 'N/A' && (
              parseFloat(boughtPerformance) > 0 
                ? <TrendingUp className="h-5 w-5 text-green-500" />
                : <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>
      </div>
  
      {/* Undo Checkbox */}
      <div className="mb-4">
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-purple-700"
          onChange={handleUndoChange}
        />
        <label className="ml-2 text-sm text-gray-700">Undo Trade</label>
      </div>
  
      {/* Trade Details Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sold Details */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-800 mb-3">Sold Assets</h3>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">Amount:</span>
              <div className="font-medium truncate ml-2 max-w-[60%] text-right">
                {totalSoldValue ? `${formatNumber(totalSoldValue)} ${soldSymbol}` : 'N/A'}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Initial Value:</span>
              <span className="font-medium">${formatNumber(totalSoldUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Value:</span>
              <span className="font-medium">
                ${formatNumber(totalSoldValue * currentSoldPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Performance:</span>
              <span className={`font-medium ${
                soldPerformance !== 'N/A' && parseFloat(soldPerformance) > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {soldPerformance !== 'N/A' ? `${formatNumber(soldPerformance, 2)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
  
        {/* Bought Details */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-800 mb-3">Bought Assets</h3>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">Amount:</span>
              <div className="font-medium truncate ml-2 max-w-[60%] text-right">
                {totalBoughtValue ? `${formatNumber(totalBoughtValue)} ${boughtSymbol}` : 'N/A'}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Initial Value:</span>
              <span className="font-medium">${formatNumber(totalBoughtUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Value:</span>
              <span className="font-medium">
                ${formatNumber(totalBoughtValue * currentBoughtPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Performance:</span>
              <span className={`font-medium ${
                boughtPerformance !== 'N/A' && parseFloat(boughtPerformance) > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {boughtPerformance !== 'N/A' ? `${formatNumber(boughtPerformance, 2)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
  
      {/* Footer Section */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {attributes.mined_at ? new Date(attributes.mined_at).toLocaleString() : 'N/A'}
        </span>
        <button
          className="bg-purple-700 text-white px-6 py-2 rounded-lg hover:bg-purple-800 transition-colors duration-200"
          onClick={() => navigate(`/transaction-details/${transactionNumber}`, { state: { transaction } })}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default TransactionCard;
  