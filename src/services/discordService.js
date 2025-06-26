import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

export async function sendDiscordNotification(channelId, message) {
  try {
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