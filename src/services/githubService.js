const axios = require("axios");
const prisma =require( "../config/prisma.js");

const API = "https://api.github.com";

async function getRepositoryIssues(userId, owner, repo, since) {

  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });
  const token = account?.access_token || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("No GitHub token available");

  const url = `${API}/repos/${owner}/${repo}/issues`;
  const params = {
    state: "open",
    since: since ? new Date(since).toISOString() : undefined,
    per_page: 100,
  };
  const headers = {
    Authorization: `token ${token}`,
    "User-Agent": "gittrek-notifier",
  };

  const resp = await axios.get(url, { params, headers });
  return resp.data;
}


module.exports = getRepositoryIssues;