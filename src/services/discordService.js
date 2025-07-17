const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();
const client = new Client({
  intents: [GatewayIntentBits.DirectMessages],
  partials: ["CHANNEL"],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN).catch((err) => {
  console.error("❌ Failed to login to Discord:", err);
});

async function sendDiscordNotification(discordId, issues) {
  try {
    if (!client.isReady()) {
      console.error("Discord client is not ready.");
      return;
    }

    const user = await client.users.fetch(discordId);
    if (!user) {
      console.error(`❌ Discord user with ID ${discordId} not found.`);
      return;
    }

    let message = `🔔 **GitHub Issues Matching Your Interests:**\n\n`;

    for (const repo in issues) {
      message += `📦 **${repo}**\n`;
      issues[repo].forEach((issue, index) => {
        message += `> [${index + 1}. ${issue.title}](${issue.url})\n`;
      });
      message += `\n`;
    }

    // Split large messages if exceeding Discord's 2000 character limit
    const messageChunks = splitMessage(message, 2000);

    // console.log("Message Chunks: ", messageChunks);

    for (const chunk of messageChunks) {
      await user.send(chunk);
    }

    console.log(`✅ Sent notification to Discord user`);
  } catch (error) {
    console.error("❌ Error sending Discord notification:", error);
  }
}

function splitMessage(message, maxLength) {
  const lines = message.split("\n");
  const chunks = [];
  let currentChunk = "";

  for (const line of lines) {
    if ((currentChunk + "\n" + line).length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += "\n" + line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

module.exports = { sendDiscordNotification };
