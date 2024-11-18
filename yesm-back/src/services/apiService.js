const axios = require('axios');
const logger = require('../utils/logger');

const ZERION_API_URL = 'https://api.zerion.io/v1';
const ZERION_API_KEY = process.env.ZERION_API_KEY;
const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const CRYPTOCOMPARE_API_KEY = process.env.CRYPTOCOMPARE_API_KEY;
require('dotenv').config();

class ApiService {
  static async makeZerionRequest(url, params = {}) {
    try {
      const headers = {
        Authorization: `Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`,
        accept: 'application/json',
      };

      logger.info('Making Zerion API request:', { url, params });
      const response = await axios.get(url, { headers, params });
      return response.data;
    } catch (error) {
      logger.error('Zerion API request failed:', {
        url,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  static async fetchTokenPrices(contractAddresses) {
    const prices = {};
    
    for (const token of contractAddresses) {
      try {
        const { chain, address, symbol } = token;

        if (symbol?.toUpperCase() === 'ETH' && chain === 'ethereum') {
          const data = await this.makeZerionRequest(`${ZERION_API_URL}/fungibles/eth?fields=market_data.price`);
          const price = data.data.attributes.market_data?.price;
          
          prices['ethereum:eth'] = {
            usd: price !== undefined ? price : null,
            symbol: 'ETH',
            name: 'Ethereum',
          };
          
          logger.info(`Fetched ETH price: $${price}`);
          continue;
        }

        if (!chain || !address) {
          logger.error(`Invalid token data:`, { chain, address });
          continue;
        }

        const data = await this.makeZerionRequest(`${ZERION_API_URL}/fungibles/${address}?fields=market_data.price`);
        const price = data.data.attributes.market_data?.price;
        const priceKey = `${chain}:${address}`;

        prices[priceKey] = {
          usd: price !== undefined ? price : null,
          symbol: symbol,
        };

        logger.info(`Fetched price for ${symbol}:`, { address, price });
      } catch (error) {
        logger.error('Error fetching token price:', {
          token,
          error: error.message,
          response: error.response?.data
        });
        continue;
      }
    }

    return prices;
  }
  
  static async fetchFearGreedIndex(timestamp) {
    try {
      const daysAgo = Math.floor((Date.now() - new Date(timestamp)) / (1000 * 60 * 60 * 24));
      const limit = Math.min(daysAgo + 1, 365);
      
      const response = await axios.get(`https://api.alternative.me/fng/?limit=${limit}&format=json`);
      
      if (!response.data?.data) {
        throw new Error('Invalid API response');
      }

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
      const yearBefore = new Date(date);
      yearBefore.setFullYear(date.getFullYear() - 1);
      const startDate = yearBefore.toISOString().split('T')[0];

      if (!FRED_API_KEY) {
        throw new Error('FRED API key is not configured');
      }

      const m2Response = await axios.get(FRED_BASE_URL, {
        params: {
          series_id: 'M2SL',
          api_key: FRED_API_KEY,
          file_type: 'json',
          observation_start: startDate,
          observation_end: endDate,
          frequency: 'm'
        }
      });

      if (!m2Response.data?.observations) {
        throw new Error('Invalid FRED API response');
      }

      const observations = m2Response.data.observations;
      if (!observations || observations.length === 0) {
        throw new Error('No M2 data available');
      }

      const currentValue = parseFloat(observations[observations.length - 1].value);
      const threeMonthIndex = Math.max(observations.length - 4, 0);
      const threeMonthValue = parseFloat(observations[threeMonthIndex].value);
      const threeMonthChange = ((currentValue - threeMonthValue) / threeMonthValue) * 100;
      const yearAgoValue = parseFloat(observations[0].value);
      const yearChange = ((currentValue - yearAgoValue) / yearAgoValue) * 100;
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
      const thirtyDaysBefore = new Date(date);
      thirtyDaysBefore.setDate(date.getDate() - 30);
      const startDate = thirtyDaysBefore.toISOString().split('T')[0];

      const cryptoResponse = await axios.get('https://min-api.cryptocompare.com/data/v2/histoday', {
        params: {
          fsym: 'BTC',
          tsym: 'USD',
          limit: 30,
          toTs: Math.floor(date.getTime() / 1000),
          api_key: CRYPTOCOMPARE_API_KEY
        }
      });

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