
function getRedisConnection() {
  const connection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6379),
  };
  if (!connection.host) {
    throw new Error('REDIS_HOST environment variable is required');
  }
  return connection;
}

module.exports = getRedisConnection;
