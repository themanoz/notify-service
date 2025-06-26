// Improved: Standardized imports, added error handling, and graceful shutdown
const githubCheckWorker = require('./workers/githubCheckWorker.js');

console.log('BullMQ Worker started, waiting for jobs...');

async function shutdown(signal) {
  try {
    console.log(`${signal} received, shutting down worker...`);
    await githubCheckWorker.close();
    console.log('Worker shut down.');
    process.exit(0);
  } catch (err) {
    console.error('Error during worker shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
