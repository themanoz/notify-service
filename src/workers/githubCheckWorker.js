// Improved: Added error handling, logging, and code style
const { Worker } = require('bullmq');
const connection = require('../config/redis.js');
const getRepositoryIssues = require('../services/githubService.js');

const worker = new Worker(
  'githubCheck',
  async (job) => {
    console.log(`Jobs will be picked up by worker with job ID: ${job.id}`);
    const { projectId, userId, owner, repo, lastChecked } = job.data;
    console.log(
      `Processing ${owner}/${repo} (proj:${projectId}, user:${userId})`
    );
    try {
      const issues = await getRepositoryIssues(
        userId,
        owner,
        repo,
        lastChecked
      );
      console.log(`→ ${issues.length} open issues for ${owner}/${repo}`);
    } catch (err) {
      console.error(`Error in job ${job.id}:`, err);
      // Optionally: throw err to retry job
      throw err;
    }
  },
  {
    connection,
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  }
);

worker.on('completed', (job) => console.log(`✅ Job ${job.id} done`));
worker.on('failed', (job, e) => console.error(`❌ Job ${job.id} failed`, e));
worker.on('error', (err) => console.error('Worker error:', err));

module.exports = worker;
