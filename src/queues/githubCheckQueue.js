const { Queue } = require('bullmq');
const connection = require('../config/redis.js');

let githubCheckQueue;
try {
  githubCheckQueue = new Queue('githubCheck', { connection, prefix:"notifyService" });
} catch (err) {
  console.error('Failed to initialize githubCheckQueue:', err);
  throw err;
}

module.exports = githubCheckQueue;
