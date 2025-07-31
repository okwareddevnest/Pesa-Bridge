const logger = require('./logger');

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }


  get(key) {
    return this.cache.get(key);
  }

  del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  // For compatibility with existing Redis-like interface
  async setex(key, ttlSeconds, value) {
    this.setWithTTL(key, value, ttlSeconds);
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  // Redis-style set with EX parameter support
  async set(key, value, ...args) {
    let ttlSeconds = 3600; // Default TTL

    // Parse Redis-style arguments: SET key value [EX seconds]
    if (args.length >= 2 && args[0] === 'EX') {
      ttlSeconds = parseInt(args[1]);
    }

    // Call the original set method
    this.setWithTTL(key, value, ttlSeconds);
    return 'OK';
  }

  // Original set method renamed to avoid conflict
  setWithTTL(key, value, ttlSeconds = 3600) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, value);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  // Check if connected (for compatibility)
  isConnected() {
    return true;
  }
}

const cache = new SimpleCache();

// Graceful shutdown
process.on('SIGINT', () => {
  cache.clear();
  logger.info('Cache cleared on shutdown');
});

process.on('SIGTERM', () => {
  cache.clear();
  logger.info('Cache cleared on shutdown');
});

// Export Redis-compatible interface
module.exports = {
  client: cache,
  isConnected: () => cache.isConnected(),
  get: (...args) => cache.get(...args),
  set: (...args) => cache.set(...args),
  setex: (...args) => cache.setex(...args),
  del: (...args) => cache.del(...args),
  ping: (...args) => cache.ping(...args),
  
  // Direct access to cache instance
  cache
}; 