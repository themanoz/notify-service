const cron = require("node-cron");
const prisma = require("../config/prisma.js");
const githubCheckQueue = require("../queues/githubCheckQueue.js");

function startCronScheduler() {
 console.log("Cron scheduler started: polling every 30 seconds");

  cron.schedule("*/30 * * * * *", async () => {
    console.log("Cron run: fetching user watchlist repositories...");

    try {
      const repositories = await prisma.watchlist.findMany({
        select: {
          id: true,
          project: {
            select:{
              id: true,
              full_name: true,
             
            }
          },
          addedAt: true,
          labels: true,
          lastChecked: true,
        }
      });

      console.log(`Found ${repositories.length} repositories to check`);

      for (const repository of repositories) {
        const [owner, repo] = repository.project.full_name.split("/");
        if (!owner || !repo) {
          console.warn(
            `Skipping project ${repository.id} with invalid full_name: ${repository.full_name}`
          );
          continue;
        }

        // ✅ Enqueue a single job per project
        await githubCheckQueue.add(
          `check-${repository.id}`,
          {
            projectId: repository.project.id,
            owner,
            repo,
            since: repository.lastChecked ?? repository.addedAt,
          },
          {
            jobId: `check-${repository.id}`,
            removeOnComplete: true,
            removeOnFail: true,
            timeout: 15000,
          } 
        );

        console.log(`Enqueued ${owner}/${repo}`);
      }
    } catch (err) {
      console.error(`❌ Error running cron job`, err);
      throw err;
    }
  });
}

module.exports = startCronScheduler;
