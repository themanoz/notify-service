const { Worker } = require("bullmq");
const connection = require("../config/redis");
const getRepositoryIssues = require("../services/githubService.js");
const prisma = require("../config/prisma.js");
const notificationQueue = require("../queues/notificationQueue.js");
require('dotenv').config();

const worker = new Worker(
  "githubCheck",
  async (job) => {
    console.log(`Jobs getting picked up by githubCheckWorker.`);

    const { projectId, owner, repo, since } = job.data;

    try {
      const watchlistEntries = await prisma.watchlist.findMany({
        where: { projectId },
        select: {
          id: true,
          userId: true,
          labels: true,
          addedAt: true,
        },
      });

      if (!watchlistEntries || watchlistEntries.length === 0) {
        console.warn(`No users watching project ${projectId}`);
        return;
      }

      console.log(`Fetching issues for ${owner}/${repo} since ${since}`);

      const randomUser =
        watchlistEntries[Math.floor(Math.random() * watchlistEntries.length)];
      const { userId } = randomUser;

      const issues = await getRepositoryIssues(
        userId,
        owner,
        repo,
        new Date(since).toISOString()
      );

      if (issues.length === 0) {
        console.log(`No new issues found for ${owner}/${repo}`);
        return;
      }

      const userIssuesMap = {};

      for (const entry of watchlistEntries) {
        const userId = entry.userId;

        if (!userIssuesMap[userId]) {
          userIssuesMap[userId] = {};
        }

        const userLabels = entry.labels.map((label) => label.toLowerCase());

        for (const issue of issues) {
          const issueLabels = issue.labels.map((label) =>
            label.name.toLowerCase()
          );

          if (issueLabels.some((label) => userLabels.includes(label))) {
            if (!userIssuesMap[userId][`${owner}/${repo}`]) {
              userIssuesMap[userId][`${owner}/${repo}`] = [];
            }

            userIssuesMap[userId][`${owner}/${repo}`].push({
              title: issue.title,
              url: issue.html_url,
            });
          }
        }
      }

      if (Object.keys(userIssuesMap).length === 0) {
        console.log(`No issues matched for any users in project ${projectId}`);
        return;
      }

      // Enqueue batch notifications for each user
      for (const userId of Object.keys(userIssuesMap)) {
        await notificationQueue.add(
          "sendNotification",
          {
            userId,
            issuesByRepo: userIssuesMap[userId],
          },
          { removeOnComplete: true }
        );

        console.log(`Enqueued notification for users`);
      }

      await prisma.watchlist.updateMany({
        where: { projectId: projectId },
        data: { lastChecked: new Date() },
      });

      console.log(`✅ Completed githubCheck job for ${owner}/${repo}`);
    } catch (err) {
      console.error(`❌ Error processing job ${job.id}:`, err);
      throw err;
    }
  },
  {
    connection,
    prefix: "notifyService",
    concurrency: 5,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnFail: true,
    removeOnComplete: true,
    timeout: 15000,
  }
);

worker.on("completed", (job) => console.log(`✅ Job ${job.id} done`));
worker.on("failed", (job, e) => console.error(`❌ Job ${job.id} failed`, e));
worker.on("error", (err) => console.error("Worker error:", err));

module.exports = worker;
