// const Redis = require("ioredis");

// const redis = new Redis({
//   host: process.env.REDIS_HOST || "127.0.0.1",
//   port: Number(process.env.REDIS_PORT || 6379),
//   maxRetriesPerRequest: null,
// });

// module.exports = redis;

const Redis = require("ioredis");

const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

module.exports = redis;
