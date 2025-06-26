const githubCheckWorker = require("./workers/githubCheckWorker.js");

console.log("BullMQ Worker started, waiting for jobs...");

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down worker...");
  await githubCheckWorker.close();
  console.log("Worker shut down.");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down worker...");
  await githubCheckWorker.close();
  console.log("Worker shut down.");
  process.exit(0);
});
