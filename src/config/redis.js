const Redis = require("ioredis");

const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // family: 6,
});
redis.ping().then(console.log).catch(console.error);

module.exports = redis;
