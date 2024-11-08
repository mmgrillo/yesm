const NodeCache = require('node-cache');

// Cache with 5 minute TTL by default
const cache = new NodeCache({ stdTTL: 300 });

class CacheService {
  static get(key) {
    return cache.get(key);
  }

  static set(key, value) {
    return cache.set(key, value);
  }

  static generateKey(endpoint, params) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }
}

module.exports = CacheService;