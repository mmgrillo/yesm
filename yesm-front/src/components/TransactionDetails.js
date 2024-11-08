import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Info, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import { getSupportedImplementation } from '../utils/tokenUtils';
import useFearGreedIndex from '../hooks/useFearGreedIndex';
import FearGreedGauge from './FearGreedGauge';
import useMacroData from '../hooks/useMacroData';
import MacroContext from './MacroContext';
import DetailedMacroContext from './DetailedMacroContext';
import DetailedMarketIndicators from './DetailedMarketIndicators';
import useVolatilityIndices from '../hooks/useVolatilityIndices';

const TransactionDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  
  const transaction = location.state?.transaction;
  const tokenPrices = location.state?.tokenPrices;
  const attributes = transaction?.attributes || {};
  const transfers = attributes.transfers || [];
  const { fearGreedIndex, isLoading: fgiLoading } = useFearGreedIndex(attributes.mined_at);
  const { macroData, isLoading: macroLoading } = useMacroData(attributes.mined_at);
  const { volatilityData, isLoading: volatilityLoading } = useVolatilityIndices(attributes.mined_at);
  



  const formatNumber = (num, maxDecimals = 4) => {
    if (typeof num !== 'number') return 'N/A';
    if (Math.abs(num) < 0.0001) return num.toExponential(2);
    return num.toLocaleString(undefined, {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: 2
    });
  };

  const getCurrentPrice = (chain, address, symbol) => {
    const priceKey = symbol?.toLowerCase() === 'eth' ? 'ethereum:eth' : `${chain}:${address || symbol?.toLowerCase()}`;
    return tokenPrices[priceKey]?.usd || 'N/A';
  };

  const soldTransfers = transfers.filter(t => t.direction === 'out');
  const boughtTransfers = transfers.filter(t => t.direction === 'in');

  const calculateTransferDetails = (transfers) => {
    if (!transfers.length) return null;

    const totalValue = transfers.reduce((sum, t) => sum + (t.quantity?.float || 0), 0);
    const totalUSD = transfers.reduce((sum, t) => sum + (t.price * (t.quantity?.float || 0)), 0);
    const symbol = transfers[0]?.fungible_info?.symbol?.toUpperCase() || 'N/A';
    const implementation = getSupportedImplementation(transfers[0]?.fungible_info);
    const currentPrice = implementation
      ? getCurrentPrice(implementation.chain_id, implementation.address, symbol)
      : 'N/A';
    const currentValue = currentPrice !== 'N/A' ? totalValue * currentPrice : 'N/A';
    const performance = totalUSD !== 0 && currentPrice !== 'N/A'
      ? ((currentValue - totalUSD) / totalUSD) * 100
      : 'N/A';

    return {
      totalValue,
      totalUSD,
      symbol,
      currentPrice,
      currentValue,
      performance
    };
  };

  const soldDetails = calculateTransferDetails(soldTransfers);
  const boughtDetails = calculateTransferDetails(boughtTransfers);

  const calculateRPI = () => {
    if (!soldDetails || !boughtDetails) return 'N/A';
    if (soldDetails.performance === 'N/A' || boughtDetails.performance === 'N/A') return 'N/A';
    return ((boughtDetails.performance - soldDetails.performance) / 100 * 100).toFixed(2);
  };

  const rpi = calculateRPI();

  if (!transaction || !tokenPrices) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-lg text-red-600">Transaction details not found</div>
      </div>
    );
  }
  


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Transactions
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white shadow-lg rounded-xl p-8">
          {/* Transaction Overview */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* RPI Card */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg text-gray-700 font-medium">RPI</span>
                <button className="group relative">
                  <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    The Relative Performance Index (RPI) compares the performance of bought vs. sold assets.
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">
                  {rpi !== 'N/A' ? `${formatNumber(parseFloat(rpi), 2)}%` : 'N/A'}
                </span>
                {rpi !== 'N/A' && parseFloat(rpi) !== 0 && (
                  parseFloat(rpi) > 0 
                    ? <TrendingUp className="h-6 w-6 text-green-500" />
                    : <TrendingDown className="h-6 w-6 text-red-500" />
                )}
              </div>
            </div>

            {/* Transaction Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction Hash</span>
                  <a 
                    href={`https://etherscan.io/tx/${attributes.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate ml-2 max-w-[200px]"
                  >
                    {attributes.hash || 'N/A'}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time</span>
                  <span>{new Date(attributes.mined_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network Fee</span>
                  <span>${formatNumber(attributes.fee?.value || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {!macroLoading && !volatilityLoading && (
            <div className="mt-8">
              <DetailedMarketIndicators 
                fearGreedData={fearGreedIndex}
                macroData={macroData}
                volatilityData={volatilityData}
              />
            </div>
          )}

          {/* Detailed Analysis */}
          <div className="grid grid-cols-2 gap-8">
            {/* Sold Assets */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">Sold Assets</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Initial Value:</span>
                    <span className="font-medium">${formatNumber(soldDetails?.totalUSD || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Current Value:</span>
                    <span className="font-medium">${formatNumber(soldDetails?.currentValue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Performance:</span>
                    <span className={`font-medium ${
                      soldDetails?.performance > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {soldDetails?.performance !== 'N/A' ? `${formatNumber(soldDetails?.performance)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              {soldTransfers.map((transfer, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-600">Token:</span>
                    <span className="font-medium">{transfer.fungible_info?.symbol?.toUpperCase() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{formatNumber(transfer.quantity?.float || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price at Sale:</span>
                    <span className="font-medium">${formatNumber(transfer.price || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Price:</span>
                    <span className="font-medium">
                      ${formatNumber(getCurrentPrice(
                        getSupportedImplementation(transfer.fungible_info)?.chain_id,
                        getSupportedImplementation(transfer.fungible_info)?.address,
                        transfer.fungible_info?.symbol
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <a 
                      href={`https://etherscan.io/address/${transfer.from}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate ml-2 max-w-[200px]"
                    >
                      {transfer.from}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Bought Assets */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">Bought Assets</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Initial Value:</span>
                    <span className="font-medium">${formatNumber(boughtDetails?.totalUSD || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Current Value:</span>
                    <span className="font-medium">${formatNumber(boughtDetails?.currentValue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Performance:</span>
                    <span className={`font-medium ${
                      boughtDetails?.performance > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {boughtDetails?.performance !== 'N/A' ? `${formatNumber(boughtDetails?.performance)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              {boughtTransfers.map((transfer, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-600">Token:</span>
                    <span className="font-medium">{transfer.fungible_info?.symbol?.toUpperCase() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{formatNumber(transfer.quantity?.float || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price at Purchase:</span>
                    <span className="font-medium">${formatNumber(transfer.price || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Price:</span>
                    <span className="font-medium">
                      ${formatNumber(getCurrentPrice(
                        getSupportedImplementation(transfer.fungible_info)?.chain_id,
                        getSupportedImplementation(transfer.fungible_info)?.address,
                        transfer.fungible_info?.symbol
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">To:</span>
                    <a 
                      href={`https://etherscan.io/address/${transfer.to}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate ml-2 max-w-[200px]"
                    >
                      {transfer.to}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;