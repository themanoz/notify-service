// Improved: Added error handling, logging, and code style
const cron = require('node-cron');
const prisma = require('../config/prisma.js');
const githubCheckQueue = require('../queues/githubCheckQueue.js');

function startCronScheduler() {
  console.log('Cron scheduler started: polling every minute');

  cron.schedule('*/1 * * * *', async () => {
    console.log('Cron run: fetching projects…');
    try {
      const projects = await prisma.project.findMany({
        select: {
          id: true,
          full_name: true,
          lastChecked: true,
          users: { select: { id: true } },
        },
      });

      for (const proj of projects) {
        const [owner, repo] = proj.full_name.split('/');
        if (!owner || !repo) {
          console.warn(`Invalid full_name for project ${proj.id}: ${proj.full_name}`);
          continue;
        }
        for (const { id: userId } of proj.users) {
          try {
            await githubCheckQueue.add(
              `check-${proj.id}-${userId}`,
              {
                projectId: proj.id,
                userId,
                owner,
                repo,
                lastChecked: proj.lastChecked,
              },
              { jobId: `check-${proj.id}-${userId}`, removeOnComplete: true }
            );
            console.log(`Enqueued ${owner}/${repo} for user ${userId}`);
          } catch (err) {
            console.error(`Failed to enqueue job for project ${proj.id}, user ${userId}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching projects in cron job:', err);
    }
  });
}

module.exports = startCronScheduler;
