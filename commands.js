import 'dotenv/config';
import { InstallGlobalCommands, InstallGuildCommands } from './utils.js';

const commands = [
  {
    name: 'test',
    description: 'Test command that returns a random emoji'
  },
  {
    name: 'chat',
    description: 'Send a message to the AI assistant connected to LM Studio',
    options: [
      {
        type: 3, // STRING type
        name: 'message',
        description: 'Your message to the AI',
        required: true
      }
    ]
  },
  {
    name: 'clearchat',
    description: 'Clear conversation history for this channel'
  }
];

// Get application ID from environment or use placeholder
const appId = process.env.DISCORD_APP_ID;
const guildId = process.env.GUILD_ID; // Optional: Add your server ID

if (!appId) {
  console.error('DISCORD_APP_ID is not set in .env file');
  console.log('Please add your Discord application ID to the .env file.');
  process.exit(1);
}

// Install global commands (for user account)
InstallGlobalCommands(appId, commands);

// If guild ID is provided, also install server-specific commands
if (guildId) {
  InstallGuildCommands(appId, guildId, commands);
  console.log('Commands installed for both global and specific guild');
} else {
  console.log('Commands installed globally. Add GUILD_ID to .env for server-specific installation.');
}
