const axios = require("axios");
const prisma = require("../config/prisma.js");

const API = "https://api.github.com";

async function getRepositoryIssues(userId, owner, repo, since) {
  try {
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

    const response = await axios.get(url, { params, headers });
    console.log("Labels: ", response.data.labels);

    const issues = response.data;

    const issueDetails = issues.map((issue) => ({
      id: issue.title,
      body: issue.body,
      url: issue.html_url,
    }));

    console.log("Issue Details: ", issueDetails);
    return response.data;
  } catch (err) {
    console.error("Error fetching repository issues:", err);
    throw err;
  }
}

module.exports = getRepositoryIssues;