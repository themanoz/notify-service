const { Worker } = require("bullmq");
const connection = require("../config/redis")();
const getRepositoryIssues = require("../services/githubService.js");
const prisma = require("../config/prisma.js");
const notificationQueue = require("../queues/notificationQueue.js");

const worker = new Worker(
  "githubCheck",
  async (job) => {
    console.log(`Jobs getting picked up by githubCheckWorker.`);

    const { projectId, owner, repo, lastChecked } = job.data;

    try {
      const watchlistEntries = await prisma.watchlist.findMany({
        where: { projectId },
        select: { userId: true, labels: true, addedAt: true },
      });

      if (watchlistEntries.length === 0) {
        console.warn(`No users watching project ${projectId}`);
        return;
      }

      const randomUser =
        watchlistEntries[Math.floor(Math.random() * watchlistEntries.length)];
      const { userId, addedAt } = randomUser;

      const since = lastChecked ?? addedAt;

      console.log(`Fetching issues for ${owner}/${repo} since ${since}`);

      const issues = await getRepositoryIssues(userId, owner, repo, since);

      if (issues.length === 0) {
        console.log(`No new issues found for ${owner}/${repo}`);
        return;
      }

      // Group issues per user and per repo
      const userIssuesMap = {};

      for (const entry of watchlistEntries) {
        const userId = entry.userId;

        if (!userIssuesMap[userId]) {
          userIssuesMap[userId] = {};
        }

        const userLabels = entry.labels.map((label) => label.toLowerCase());
        console.log(`User ${userId} labels: `, userLabels);

        for (const issue of issues) {
          const issueLabels = issue.labels.map((label) =>
            label.name.toLowerCase()
          );
          console.log("Issue labels: ", issueLabels);

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

      console.log("User issues map: ",userIssuesMap);

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

        console.log(`Enqueued notification for user ${userId}`);
      }

      // Update lastChecked timestamp
      await prisma.project.update({
        where: { id: projectId },
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
  }
);

worker.on("completed", (job) => console.log(`✅ Job ${job.id} done`));
worker.on("failed", (job, e) => console.error(`❌ Job ${job.id} failed`, e));
worker.on("error", (err) => console.error("Worker error:", err));

module.exports = worker;
