const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_BOT_TOKEN).catch((err) => {
  console.error('Failed to login to Discord:', err);
});

async function sendDiscordNotification(channelId, message) {
  try {
    if (!client.isReady()) {
      console.error('Discord client is not ready.');
      return;
    }
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`Discord channel with ID ${channelId} not found.`);
      return;
    }
    await channel.send(message);
    console.log(`Notification sent to Discord channel ${channelId}`);
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}

module.exports = { sendDiscordNotification };