const redis = require("ioredis");

function getRedisConnection() {
  return new redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
  });
}

module.exports = getRedisConnection;
