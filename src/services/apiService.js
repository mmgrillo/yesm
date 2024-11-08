const axios = require('axios');

const ZERION_API_URL = 'https://api.zerion.io/v1';
const ZERION_API_KEY = process.env.ZERION_API_KEY;
const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const CRYPTOCOMPARE_API_KEY = process.env.CRYPTOCOMPARE_API_KEY;
require('dotenv').config();

const requestQueue = [];
let isProcessingQueue = false;
const THROTTLE_DELAY = 250; 

class ApiService {
  static async processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (requestQueue.length > 0) {
      const { request, resolve, reject } = requestQueue.shift();
      try {
        const response = await request();
        resolve(response);
      } catch (error) {
        reject(error);
      }
      // Wait before processing next request
      await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY));
    }
    
    isProcessingQueue = false;
  }

  static async throttledRequest(requestFn) {
    return new Promise((resolve, reject) => {
      requestQueue.push({ request: requestFn, resolve, reject });
      this.processQueue();
    });
  }

  static async fetchTokenPrices(contractAddresses) {
    const prices = {};

    for (const token of contractAddresses) {
      const { chain, address, symbol } = token;

      // Updated handling for Ethereum (ETH)
      if (symbol?.toUpperCase() === 'ETH' && chain === 'ethereum') {
        try {
          const apiUrl = `${ZERION_API_URL}/fungibles/${address}?fields=market_data.price`;
          const headers = {
            Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
            accept: 'application/json',
          };
          const response = await axios.get(apiUrl, { headers });
          const price = response.data.data.attributes.market_data?.price;
          
          // Use 'ethereum:eth' as the key to be consistent with the frontend
          prices['ethereum:eth'] = {
            usd: price !== undefined ? price : null,
            symbol: 'ETH',
            name: 'Ethereum',
          };
          
          console.log(`Fetched price for ETH: $${price}`);
          continue;
        } catch (error) {
          console.error('Error fetching price for ETH:', error.response ? error.response.data : error.message);
          prices['ethereum:eth'] = { usd: null, symbol: 'ETH', name: 'Ethereum' };
          continue;
        }
      }

      // Skip processing if non-ETH token is missing chain or address
      if (!chain || !address) {
        console.error(`Invalid token data: chain=${chain}, address=${address}`);
        continue;
      }

      // Fetch price for non-ETH tokens
      const apiUrl = `${ZERION_API_URL}/fungibles/${address}?fields=market_data.price`;
      const headers = {
        Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
        accept: 'application/json',
      };

      try {
        const response = await axios.get(apiUrl, { headers });
        const price = response.data.data.attributes.market_data?.price;
        const tokenSymbol = symbol; // Using provided symbol for consistency
        const priceKey = `${chain}:${address}`;

        prices[priceKey] = {
          usd: price !== undefined ? price : null,
          symbol: tokenSymbol,
        };

        console.log(`Price for token ${address} (symbol: ${tokenSymbol}): $${price}`);
      } catch (error) {
        console.error(`Error fetching price for ${address}:`, error.response ? error.response.data : error.message);
        prices[`${chain}:${address}`] = { usd: null, symbol: null };
      }
    }

    return prices;
  }
  
  static async fetchFearGreedIndex(timestamp) {
    try {
      // Convert timestamp to days ago (API accepts 0-365)
      const daysAgo = Math.floor((Date.now() - new Date(timestamp)) / (1000 * 60 * 60 * 24));
      
      // Ensure we don't exceed API limits
      const limit = Math.min(daysAgo + 1, 365);
      
      const response = await axios.get(`https://api.alternative.me/fng/?limit=${limit}&format=json`);
      
      if (!response.data?.data) {
        throw new Error('Invalid API response');
      }

      // Find the closest date to our timestamp
      const targetDate = new Date(timestamp).setHours(0, 0, 0, 0);
      const closestIndex = response.data.data.find(item => {
        const itemDate = new Date(item.timestamp * 1000).setHours(0, 0, 0, 0);
        return itemDate === targetDate;
      });

      return closestIndex || response.data.data[response.data.data.length - 1];
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);
      throw error;
    }
  }
  
  static async fetchMacroIndicators(timestamp) {
    try {
      const date = new Date(timestamp);
      const endDate = date.toISOString().split('T')[0];
      
      // Get date 1 year before
      const yearBefore = new Date(date);
      yearBefore.setFullYear(date.getFullYear() - 1);
      const startDate = yearBefore.toISOString().split('T')[0];

      if (!FRED_API_KEY) {
        throw new Error('FRED API key is not configured');
      }

      // Fetch M2 data
      const m2Response = await axios.get(FRED_BASE_URL, {
        params: {
          series_id: 'M2SL', // M2 Money Stock
          api_key: FRED_API_KEY,
          file_type: 'json',
          observation_start: startDate,
          observation_end: endDate,
          frequency: 'm' // Monthly frequency
        }
      });

      if (!m2Response.data?.observations) {
        throw new Error('Invalid FRED API response');
      }

      const observations = m2Response.data.observations;
      if (!observations || observations.length === 0) {
        throw new Error('No M2 data available');
      }

      // Get the most recent M2 value before or at the trade date
      const currentValue = parseFloat(observations[observations.length - 1].value);
      
      // Calculate 3-month change
      const threeMonthIndex = Math.max(observations.length - 4, 0);
      const threeMonthValue = parseFloat(observations[threeMonthIndex].value);
      const threeMonthChange = ((currentValue - threeMonthValue) / threeMonthValue) * 100;

      // Calculate year-over-year change
      const yearAgoValue = parseFloat(observations[0].value);
      const yearChange = ((currentValue - yearAgoValue) / yearAgoValue) * 100;

      // Calculate average growth rate
      const avgMonthlyGrowth = observations.reduce((acc, curr, i, arr) => {
        if (i === 0) return 0;
        const monthlyChange = ((parseFloat(curr.value) - parseFloat(arr[i-1].value)) / parseFloat(arr[i-1].value)) * 100;
        return acc + monthlyChange;
      }, 0) / (observations.length - 1);

      return {
        currentValue,
        threeMonthChange,
        yearChange,
        avgMonthlyGrowth,
        timestamp: date.getTime(),
        observations: observations.map(obs => ({
          date: obs.date,
          value: parseFloat(obs.value)
        }))
      };
    } catch (error) {
      console.error('Error fetching macro indicators:', error);
      throw error;
    }
  }

  static async fetchVolatilityIndices(timestamp) {
    try {
      const date = new Date(timestamp);
      const endDate = date.toISOString().split('T')[0];
      
      // Get date 30 days before for historical context
      const thirtyDaysBefore = new Date(date);
      thirtyDaysBefore.setDate(date.getDate() - 30);
      const startDate = thirtyDaysBefore.toISOString().split('T')[0];

      // Fetch Crypto Volatility with throttling
      const cryptoResponse = await this.throttledRequest(async () => {
        return axios.get('https://min-api.cryptocompare.com/data/v2/histoday', {
          params: {
            fsym: 'BTC',
            tsym: 'USD',
            limit: 30,
            toTs: Math.floor(date.getTime() / 1000),
            api_key: CRYPTOCOMPARE_API_KEY
          },
          headers: {
            'Cache-Control': 'max-age=300' // Cache for 5 minutes
          }
        });
      });

      // Process crypto data
      const cryptoData = cryptoResponse.data.Data.Data;
      const cryptoVolatility = this.calculateVolatility(cryptoData.map(d => d.close));
      const cryptoHistoricalMean = this.calculateMean(cryptoData.map(d => d.close));

      return {
        crypto: {
          current: cryptoVolatility,
          historicalMean: cryptoHistoricalMean,
          trend: this.calculateTrend(cryptoData.map(d => d.close)),
          historical: cryptoData.map(d => ({
            date: new Date(d.time * 1000).toISOString().split('T')[0],
            value: d.close
          }))
        },
        timestamp: date.getTime()
      };
    } catch (error) {
      console.error('Error fetching volatility indices:', error);
      // Return null values instead of throwing
      return {
        crypto: {
          current: null,
          historicalMean: null,
          trend: null,
          historical: []
        },
        timestamp: null
      };
    }
  }

  static calculateVolatility(prices) {
    try {
      const returns = prices.slice(1).map((price, i) => 
        Math.log(price / prices[i])
      );
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      return Math.sqrt(variance * 252) * 100;
    } catch (error) {
      console.error('Error calculating volatility:', error);
      return null;
    }
  }

  static calculateMean(values) {
    try {
      return values.reduce((a, b) => a + b, 0) / values.length;
    } catch (error) {
      console.error('Error calculating mean:', error);
      return null;
    }
  }

  static calculateTrend(values) {
    try {
      const n = values.length;
      if (n < 2) return 0;
      
      const xMean = (n - 1) / 2;
      const yMean = values.reduce((a, b) => a + b, 0) / n;
      
      let numerator = 0;
      let denominator = 0;
      
      values.forEach((y, x) => {
        numerator += (x - xMean) * (y - yMean);
        denominator += Math.pow(x - xMean, 2);
      });
      
      return numerator / denominator;
    } catch (error) {
      console.error('Error calculating trend:', error);
      return null;
    }
  }
}

module.exports = ApiService;
