import fs from 'fs';
import path from 'path';

// --- Crash Reporter ---
process.on('uncaughtException', (error, origin) => {
  const logMessage = `
--- UNCAUGHT EXCEPTION ---
Timestamp: ${new Date().toISOString()}
Origin: ${origin}
Error: ${error.stack || error}
`;
  const logFileName = `revolt-cli-crash-${Date.now()}.txt`;
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
  fetchApiConfig,
} from './lib/api';
import {
  User,
  Channel,
  Server,
  ReadyPayload,
  MessagePayload,
  Role,
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
  handleNick,
  handleReply,
  handleEdit,
  handleDelete,
  handleProfile,
  handleStatus,
  handleLogout,
  handleUserConfig,
  handleServerConfig,
  handleConfig,
  handleKick,
  handleBan,
  handleTimeout,
  handleReact,
  handleUnreact,
  handleFriends,
  handleNote,
  handleClear,
} from './lib/commands';

// --- Application State ---
enum AppState {
  INITIALIZING,
  SELECTION,
  CHATTING,
}

const state = {
    users: new Map<string, User>(),
    servers: new Map<string, Server>(),
    channels: new Map<string, Channel>(),
    roles: new Map<string, Role>(),
    token: '' as string | null,
    self: null as User | null,
    ws: null as WebSocket | null,
    currentChannel: null as Channel | null,
    messageCache: [] as any[],
    typingUsers: [] as string[],
    appState: AppState.INITIALIZING,
};

// --- Main Loops ---

async function messageLoop(channel: Channel) {
  while (true) {
    const userNames = state.typingUsers.map(id => state.users.get(id)?.username || 'Someone');
    const input = await promptMessage(channel.name, userNames);
    const args = input.split(' ').slice(1);
    const command = input.toLowerCase().split(' ')[0];

    if (command === '/exit') {
        state.ws?.close();
        return; // Exit the entire app
    }
    if (command === '/leave') {
        return; // Go back to channel selection
    }

    switch (command) {
        case '/whoami':
            handleWhoami(state.self);
            break;
        case '/users':
            const server = state.servers.get(channel.server)!;
            handleUsers(server, state.users);
            break;
        case '/upload':
            await handleUpload(channel._id, state.token!);
            break;
        case '/help':
            handleHelp();
            break;
        case '/clear':
            handleClear();
            break;
        case '/nick':
            await handleNick(channel.server, state.self!._id, state.token!, args);
            break;
        case '/reply':
            await handleReply(channel._id, state.token!, args, state.messageCache);
            break;
        case '/edit':
            await handleEdit(channel._id, state.token!, args, state.messageCache);
            break;
        case '/delete':
            await handleDelete(channel._id, state.token!, args, state.messageCache);
            break;
        case '/profile':
            const serverForProfile = state.servers.get(channel.server)!;
            await handleProfile(state.token!, args[0], state.users, serverForProfile);
            break;
        case '/status':
            await handleStatus(state.token!, args);
            break;
        case '/logout':
            handleLogout();
            state.ws?.close();
            return;
        case '/userconfig':
            await handleUserConfig(state.self, state.token!, args);
            break;
        case '/serverconfig':
            const serverForConfig = state.servers.get(channel.server)!;
            handleServerConfig(serverForConfig);
            break;
        case '/config':
            handleConfig(args);
            break;
        case '/kick':
            const serverForKick = state.servers.get(channel.server)!;
            await handleKick(args, state.self!, serverForKick, state.users, state.token!);;
            break;
        case '/ban':
            const serverForBan = state.servers.get(channel.server)!;
            await handleBan(args, state.self!, serverForBan, state.users, state.token!);;
            break;
        case '/timeout':
            const serverForTimeout = state.servers.get(channel.server)!;
            await handleTimeout(args, state.self!, serverForTimeout, state.users, state.token!);;
            break;
        case '/react':
            await handleReact(channel._id, state.token!, args, state.messageCache);
            break;
        case '/unreact':
            await handleUnreact(channel._id, state.token!, args, state.messageCache);
            break;
        case '/friends':
            await handleFriends(state.token!, args, state.users);
            break;
        case '/note':
            await handleNote(state.self, state.token!, args);
            break;
        default:
            if (input.trim()) {
                const sentMessage = await sendMessage(channel._id, state.token!, input);
                if (sentMessage) {
                    const formattedInput = await formatMessage(input);
                    console.log(`\n${chalk.yellow(`[${channel.name}]$`)} ${formattedInput}`);
                }
            }
            break;
    }
  }
}

async function selectServerAndChannel(): Promise<Channel | null> {
    const config = readConfig();
    const serverId = await selectServer(Array.from(state.servers.values()), config);

    if (serverId === 'my-notes') {
        const self = await fetchSelf(state.token!);
        const notes = self.profile?.content || 'You have no notes yet.';
        console.log(chalk.bold.yellow('\n--- Your Notes ---'));
        console.log(await formatMessage(notes));
        console.log(chalk.bold.yellow('--- End of Notes ---'));
        await inquirer.prompt({ type: 'input', name: 'enter', message: 'Press Enter to continue...' });
        return null; // Go back to server selection
    }
    
    console.log(chalk.gray('Fetching server members...'));
    const { users, members } = await fetchServerMembers(serverId, state.token!);;
    users.forEach(user => state.users.set(user._id, user));
    members.forEach(member => {
        const user = state.users.get(member._id.user);
        if (user) {
            user.roles = member.roles;
        }
    });

    const server = state.servers.get(serverId)!;
    const channelId = await selectChannel(server, state.channels, config);

    if (channelId === BACK_CHOICE.value) {
        return null; // User wants to go back
    }

    const selectedChannel = state.channels.get(channelId)!;
    config.lastServerId = serverId;
    config.lastChannelId = channelId;
    writeConfig(config);

    return selectedChannel;
}

// --- Application Entry Point ---

async function main() {
  console.log(chalk.blue('Revolt.chat CLI Client'));
  console.log(chalk.blue('======================'));
  console.log(chalk.gray('Type /help for a list of commands.'));

  await fetchApiConfig();

  // --- Login ---
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

  // --- WebSocket Connection ---
  state.ws = connectWebSocket(state.token!);;
  state.ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'Authenticated':
        console.log(chalk.green('Successfully authenticated with WebSocket.'));
        state.self = await fetchSelf(state.token!);;
        state.users.set(state.self._id, state.self);
        break;

      case 'Ready':
        const readyPayload = message as ReadyPayload;
        readyPayload.users.forEach(user => state.users.set(user._id, user));
        readyPayload.servers.forEach(server => {
            state.servers.set(server._id, server);
            if (server.roles) {
                Object.entries(server.roles).forEach(([id, role]) => {
                    state.roles.set(id, { ...role, _id: id });
                });
            }
        });
        readyPayload.channels.forEach(channel => state.channels.set(channel._id, channel));
        console.log(chalk.cyan('Ready to chat!'));
        state.appState = AppState.SELECTION; // Move to selection state
        break;

      case 'Message': {
        if (state.currentChannel && message.channel === state.currentChannel._id) {
            state.messageCache.push(message);
            if (message.author !== state.self?._id) {
                const author = state.users.get(message.author);
                const authorName = author ? author.username : 'Unknown User';
                const messageId = chalk.gray(`[${message._id.slice(-6)}]`);
                const formattedContent = await formatMessage(message.content);
                console.log(`\n${messageId} ${chalk.bgCyan.black(` ${authorName} `)} ${formattedContent}`);
            }
        }
        break;
      }

      case 'MessageUpdate': {
        if (state.currentChannel && message.channel === state.currentChannel._id) {
            const updatedContent = await formatMessage(message.data.content);
            console.log(chalk.italic.yellow(`\n[Message ${message.id.slice(-6)} updated] ${updatedContent}`));
        }
        break;
      }

      case 'MessageDelete': {
        if (state.currentChannel && message.channel === state.currentChannel._id) {
            console.log(chalk.italic.red(`\n[Message ${message.id.slice(-6)} deleted]`));
        }
        break;
      }

      case 'BeginTyping': {
        if (message.channel === state.currentChannel?._id && !state.typingUsers.includes(message.user)) {
          state.typingUsers.push(message.user);
        }
        break;
      }

      case 'EndTyping': {
        if (message.channel === state.currentChannel?._id) {
          state.typingUsers = state.typingUsers.filter(id => id !== message.user);
        }
        break;
      }
    }
  });

  // --- Main Application Loop ---
  while (true) {
    switch (state.appState) {
      case AppState.INITIALIZING:
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for WS to be ready
        break;

      case AppState.SELECTION:
        state.currentChannel = null; // Clear current channel
        const selectedChannel = await selectServerAndChannel();
        if (selectedChannel) {
          state.currentChannel = selectedChannel;
          state.appState = AppState.CHATTING;
        }
        break;

      case AppState.CHATTING:
        console.log(chalk.green(`Joining channel: #${state.currentChannel!.name}`));
        const pastMessages = await fetchPastMessages(state.currentChannel!._id, state.token!, 10);;
        state.messageCache = pastMessages;
        await displayPastMessages(pastMessages, state.users);
        await messageLoop(state.currentChannel!);;
        state.appState = AppState.SELECTION; // Go back to selection after leaving
        break;
    }
  }
}

main().catch(error => {
  // The global uncaughtException handler will take care of logging.
  console.error(chalk.red('An unexpected error occurred in main loop:', error.message));
  process.exit(1);
});