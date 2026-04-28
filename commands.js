import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

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

if (!appId) {
  console.error('DISCORD_APP_ID is not set in .env file');
  console.log('Please add your Discord application ID to the .env file.');
  process.exit(1);
}

InstallGlobalCommands(appId, commands);
