const { Queue } = require('bullmq');
const connection = require("../config/redis");

try {
  notificationQueue = new Queue('notificationQueue', { connection, prefix:"notifyService" });
} catch (err) {
  console.error('Failed to initialize githubCheckQueue:', err);
  throw err;
}

module.exports = notificationQueue;
