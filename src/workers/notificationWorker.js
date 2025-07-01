const { Worker } = require("bullmq");
const prisma = require("../config/prisma");
const { sendDiscordNotification } = require("../services/discordService");
const connection = require("../config/redis")();

const notificationWorker = new Worker(
  "notificationQueue",
  async (job) => {
    console.log("📦 Received job data:", JSON.stringify(job.data, null, 2));

    try {
      const { userId, issuesByRepo } = job.data;

      console.log("Issues: ", issuesByRepo);

      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user || !user.discordId) {
        console.warn(`⚠️ User not found or Discord not connected: ${userId}`);
        return;
      }

      console.log("✅ User Discord ID: ", user.discordId);

      await sendDiscordNotification(user.discordId, issuesByRepo);

      console.log(`✅ Notification sent to ${user.discordId}`);
    } catch (err) {
      console.error("❌ Worker job failed: ", err);
    }
  },
  { connection, prefix: "notifyService", concurrency: 10 }
);

module.exports = notificationWorker;
