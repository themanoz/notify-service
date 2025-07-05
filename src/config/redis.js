const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_URL,
});

module.exports = redis;