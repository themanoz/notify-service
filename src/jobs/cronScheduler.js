const cron = require("node-cron");
const prisma = require("../config/prisma.js");
const githubCheckQueue = require("../queues/githubCheckQueue.js");

function startCronScheduler() {
  console.log("Cron scheduler started: polling every 30 seconds");

  cron.schedule("*/30 * * * * *", async () => {
    console.log("Cron run: fetching projects…");

    const projects = await prisma.project.findMany({
      where: { watchlists: { some: {} } },
      select: { id: true, full_name: true, lastChecked: true },
    });

    console.log(`Found ${projects.length} projects to check`);

    for (const proj of projects) {
      const [owner, repo] = proj.full_name.split("/");
      if (!owner || !repo) {
        console.warn(
          `Skipping project ${proj.id} with invalid full_name: ${proj.full_name}`
        );
        continue;
      }

      // ✅ Enqueue a single job per project
      await githubCheckQueue.add(
        `check-${proj.id}`,
        {
          projectId: proj.id,
          owner,
          repo,
          lastChecked: proj.lastChecked,
        },
        { jobId: `check-${proj.id}`, removeOnComplete: true } // Single job per project
      );  

      console.log(`Enqueued ${owner}/${repo}`);
    }
  });
}

module.exports = startCronScheduler;
