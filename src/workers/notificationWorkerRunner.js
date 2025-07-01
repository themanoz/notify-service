const notificationWorker = require('./notificationWorker.js');
console.log('🚀 Notification Worker started...');

async function shutdown(signal) {
  console.log(`${signal} received, shutting down Notification Worker...`);
  await notificationWorker.close();
  console.log('Notification Worker shut down.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
