const { Worker } = require("bullmq");
const connection = require("../config/redis.js");
const getRepositoryIssues = require("../services/githubService.js");
const prisma = require("../config/prisma.js");
const { sendDiscordNotification } = require("../services/discordService.js");

const worker = new Worker(
  "githubCheck",
  async (job) => {
    console.log(`Job picked up: ${job.id}`);

    const { projectId, owner, repo, lastChecked } = job.data;

    try {
      const watchlistEntries = await prisma.watchlist.findMany({
        where: { projectId },
        select: { userId: true, labels: true },
      });

      if (watchlistEntries.length === 0) {
        console.warn(`No users watching project ${projectId}`);
        return;
      }

      const randomUser =
        watchlistEntries[Math.floor(Math.random() * watchlistEntries.length)];
      const { userId, addedAt } = randomUser;

      const since = lastChecked ?? addedAt;

      console.log("Fetching repositories......")

      const issues = await getRepositoryIssues(userId, owner, repo, since);

      if (issues.length === 0) {
        console.log(`No new issues found for ${owner}/${repo}`);
        return;
      }

      // Group issues per user and per repo
      const userIssuesMap = {};

      for (const entry of watchlistEntries) {
        const userId = entry.userId;

        // Initialize if not exists
        if (!userIssuesMap[userId]) {
          userIssuesMap[userId] = {};
        }

        // Filter issues by labels the user is watching
        const userLabels = entry.labels.map((label) => label.toLowerCase());
        console.log("user labels: ", userLabels);

        for (const issue of issues) {
          const issueLabels = issue.labels.map((label) =>
            label.name.toLowerCase()
          );

          console.log("issue labels: ", issueLabels);

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
      // Send Discord notifications per user
      for (const userId of Object.keys(userIssuesMap)) {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || !user.discordId) {
          console.warn(`User ${userId} does not have Discord connected.`);
          continue;
        }

        // Prepare issues in batch format
        const formattedIssues = Object.entries(userIssuesMap[userId]).map(
          ([repo, issues]) => ({
            repo,
            issues,
          })
        );

        await sendDiscordNotification(user.discordId, formattedIssues);
      }

      // Update lastChecked timestamp
      await prisma.project.update({
        where: { id: projectId },
        data: { lastChecked: new Date() },
      });

      console.log(`✅ Completed job for ${owner}/${repo}`);
    } catch (err) {
      console.error(`❌ Error processing job ${job.id}:`, err);
      throw err;
    }
  },
  {
    connection,
    concurrency: 5,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  }
);

worker.on("completed", (job) => console.log(`✅ Job ${job.id} done`));
worker.on("failed", (job, e) => console.error(`❌ Job ${job.id} failed`, e));
worker.on("error", (err) => console.error("Worker error:", err));

module.exports = worker;
