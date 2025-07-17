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

      // Collect unique projects
      const uniqueProjects = new Map();
      for (const repository of repositories) {
        const projectId = repository.project.id;
        const [owner, repo] = repository.project.full_name.split("/");
        if (!owner || !repo) {
          console.warn(
            `Skipping project ${repository.id} with invalid full_name: ${repository.full_name}`
          );
          continue;
        }
        // Only add if not already present
        if (!uniqueProjects.has(projectId)) {
          uniqueProjects.set(projectId, {
            projectId,
            owner,
            repo,
            since: repository.lastChecked ?? repository.addedAt,
          });
        }
      }

      // Enqueue a single job per unique project
      for (const project of uniqueProjects.values()) {
        await githubCheckQueue.add(
          `check-${project.projectId}`,
          {
            projectId: project.projectId,
            owner: project.owner,
            repo: project.repo,
            since: project.since,
          },
          {
            jobId: `check-${project.projectId}`,
            removeOnComplete: true,
            removeOnFail: true,
            timeout: 15000,
          }
        );
        console.log(`Enqueued ${project.owner}/${project.repo}`);
      }
    } catch (err) {
      console.error(`❌ Error running cron job`, err);
      throw err;
    }
  });
}

module.exports = startCronScheduler;
