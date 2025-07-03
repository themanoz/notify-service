const githubCheckWorker = require('./githubCheckWorker.js');

console.log('🚀 GitHub Check Worker started...');

async function shutdown(signal) {
  console.log(`${signal} received, shutting down GitHub Check Worker...`);
  await githubCheckWorker.close();
  console.log('GitHub Check Worker shut down.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
