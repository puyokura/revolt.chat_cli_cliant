

import fs from 'fs';
import path from 'path';

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
const appName = packageJson.name;

// --- Crash Reporter ---
process.on('uncaughtException', (error, origin) => {
  const logMessage = `
--- UNCAUGHT EXCEPTION ---
Timestamp: ${new Date().toISOString()}
Origin: ${origin}
Error: ${error.stack || error}
`;
  // Use a unique filename for each crash log
  const logFileName = `${appName}-crash-${Date.now()}.txt`;
  fs.writeFileSync(logFileName, logMessage, { encoding: 'utf-8' });
  console.error(`A critical error occurred. A crash log has been saved to ${logFileName}`);
  process.exit(1);
});
// ----------------------

import chalk from 'chalk';
import inquirer from 'inquirer';
import WebSocket from 'ws';
import {
  readConfig,
  writeConfig,
} from './lib/config';
import {
  login,
  connectWebSocket,
  fetchPastMessages,
  sendMessage,
  fetchSelf,
  fetchServerMembers,
} from './lib/api';
import {
  User,
  Channel,
  Server,
  ReadyPayload,
  MessagePayload
} from './lib/types';
import {
  selectServer,
  selectChannel,
  promptMessage,
  displayPastMessages,
  formatMessage,
  BACK_CHOICE
} from './lib/ui';
import {
  handleWhoami,
  handleUsers,
  handleUpload,
  handleHelp,
  handleReply,
  handleEdit,
  handleDelete,
  handleProfile,
  handleStatus,
  handleFriends
} from './lib/commands';

const state = {
    users: new Map<string, User>(),
    servers: new Map<string, Server>(),
    channels: new Map<string, Channel>(),
    token: '' as string | null,
    self: null as User | null,
    ws: null as WebSocket | null,
    currentChannelId: null as string | null,
};

async function messageLoop(channel: Channel) {
    const input = await promptMessage(channel.name);

    if (input.toLowerCase() === '/exit') {
        state.ws?.close();
        return;
    }

    const command = input.toLowerCase().split(' ')[0];

    switch (command) {
        case '/whoami':
            handleWhoami(state.self, state.users);
            break;
        case '/users':
            handleUsers(channel._id, state.channels, state.users);
            break;
        case '/upload':
            await handleUpload(channel._id, state.token!);
            break;
        case '/help':
            handleHelp();
            break;
        case '/reply':
            await handleReply(channel._id, state.token!, input.split(' ').slice(1));
            break;
        case '/edit':
            await handleEdit(channel._id, state.token!, input.split(' ').slice(1));
            break;
        case '/delete':
            await handleDelete(channel._id, state.token!, input.split(' ').slice(1));
            break;
        case '/profile':
            await handleProfile(state.token!, input.split(' ')[1], state.users);
            break;
        case '/status':
            await handleStatus(state.token!, input.split(' ').slice(1));
            break;
        case '/friends':
            await handleFriends(state.token!, input.split(' ').slice(1), state.users);
            break;
        case '/leave':
            return;
        default:
            if (input.trim()) {
                await sendMessage(channel._id, state.token!, input);
                const pendingId = chalk.yellow(`[sending...]`);
                const formattedInput = await formatMessage(input);
                console.log(`\n${pendingId} ${chalk.bgGreen.black(` ${state.self?.username} `)} ${formattedInput}`);
            }
            break;
    }
    messageLoop(channel);
}

async function channelSelectionLoop() {
    const config = readConfig();
    const serverId = await selectServer(Array.from(state.servers.values()), config);
    
    const { users: memberData } = await fetchServerMembers(serverId, state.token!);
    memberData.forEach(member => state.users.set(member._id, member));

    const serverChannels = Array.from(state.channels.values()).filter(c => c.server === serverId);
    const channelId = await selectChannel(serverChannels, config);

    if (channelId === BACK_CHOICE.value) {
        channelSelectionLoop(); // Go back to server selection
        return;
    }

    const selectedChannel = state.channels.get(channelId)!;
    config.lastServerId = serverId;
    config.lastChannelId = channelId;
    state.currentChannelId = channelId;
    writeConfig(config);

    console.log(chalk.green(`Joining channel: #${selectedChannel.name}`));
    const pastMessages = await fetchPastMessages(channelId, state.token!);
    await displayPastMessages(pastMessages, state.users);

    await messageLoop(selectedChannel);
    channelSelectionLoop(); // Loop back to server selection after leaving a channel
}

async function main() {
  console.log(chalk.blue('Revolt.chat CLI Client'));
  console.log(chalk.blue('======================'));
  console.log(chalk.gray('Type /help for a list of commands.'));

  let config = readConfig();
  state.token = config.token || null;

  if (!state.token) {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'email', message: 'Email:' },
      { type: 'password', name: 'password', message: 'Password:' },
    ]);
    try {
      state.token = await login(answers.email, answers.password);
      config.token = state.token;
      writeConfig(config);
      console.log(chalk.green('Login successful! Token saved.'));
    } catch (error: any) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  } else {
    console.log(chalk.green('Using saved token.'));
  }

  state.ws = connectWebSocket(state.token!);

  state.ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'Authenticated':
        console.log(chalk.green('Successfully authenticated with WebSocket.'));
        state.self = await fetchSelf(state.token!);
        state.users.set(state.self._id, state.self);
        break;

      case 'Ready':
        console.log(chalk.cyan('Ready to chat!'));
        const readyPayload = message as ReadyPayload;
        readyPayload.users.forEach(user => state.users.set(user._id, user));
        readyPayload.servers.forEach(server => state.servers.set(server._id, server));
        readyPayload.channels.forEach(channel => state.channels.set(channel._id, channel));
        
        channelSelectionLoop();
        break;

      case 'Message': {
        const msgPayload = message as MessagePayload;
        if (msgPayload.channel === state.currentChannelId && msgPayload.author !== state.self?._id) {
            const author = state.users.get(msgPayload.author);
            const authorName = author ? author.username : 'Unknown User';
            const messageId = chalk.gray(`[${msgPayload._id.slice(-6)}]`);
            const formattedContent = await formatMessage(msgPayload.content);
            console.log(`\n${messageId} ${chalk.bgCyan.black(` ${authorName} `)} ${formattedContent}`);
        }
        break;
      }

      case 'MessageUpdate': {
        const updatePayload = message as any;
        const updatedContent = await formatMessage(updatePayload.data.content);
        console.log(chalk.italic.yellow(`\n[Message ${updatePayload.id.slice(-6)} updated] ${updatedContent}`));
        break;
      }

      case 'MessageDelete': {
        const deletePayload = message as any;
        console.log(chalk.italic.red(`\n[Message ${deletePayload.id.slice(-6)} deleted]`));
        break;
      }
    }
  });
}

main().catch(error => {
  console.error(chalk.red('An unexpected error occurred:', error.message));
  process.exit(1);
});
