const { Queue } = require("bullmq");
const connection = require("../config/redis.js");

const githubCheckQueue = new Queue("githubCheck", { connection });

module.exports = githubCheckQueue;
