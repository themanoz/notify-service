const Redis = require("ioredis");

const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
    maxRetriesPerRequest: null,  
    enableReadyCheck: false      
  });

module.exports = redis;
