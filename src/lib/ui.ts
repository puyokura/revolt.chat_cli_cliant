import inquirer, { Separator } from 'inquirer';
import chalk from 'chalk';
import { Server, Channel, User } from './types';
import { Config, readConfig } from './config';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import inquirerFilePath from 'inquirer-file-path';
import inquirerCommandPrompt from 'inquirer-command-prompt';

inquirer.registerPrompt('file-path', inquirerFilePath);
inquirer.registerPrompt('command', inquirerCommandPrompt);

marked.setOptions({
  renderer: new TerminalRenderer(),
});

export async function formatMessage(content: string): Promise<string> {
  if (typeof content !== 'string') {
    return '';
  }
  const blockquoteFormatted = content.replace(/^> (.*)$/gm, chalk.italic.gray('“$1”'));
  const formatted = await marked(blockquoteFormatted);
  return formatted.trim();
}

export const BACK_CHOICE = { name: '.. Go Back', value: '__BACK__' };

export async function selectServer(servers: Server[], config: Config): Promise<string> {
    const serverChoices = [
        { name: '📝 My Notes', value: 'my-notes' },
        new Separator(),
        ...servers.map(server => ({ name: server.name, value: server._id }))
    ];
    const { selectedServerId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedServerId',
            message: 'Select a server:',
            choices: serverChoices,
            default: config.lastServerId,
        },
    ]);
    return selectedServerId;
}

export async function selectChannel(server: Server, channels: Map<string, Channel>, config: Config): Promise<string> {
    const channelChoices: (object | Separator)[] = [];
    const uncategorizedChannels = new Set(server.channels);

    if (server.categories) {
        for (const category of server.categories) {
            channelChoices.push(new Separator(chalk.bold.yellow(`- ${category.title} -`)));
            for (const channelId of category.channels) {
                const channel = channels.get(channelId);
                if (channel) {
                    channelChoices.push({ name: `#${channel.name}`, value: channel._id });
                    uncategorizedChannels.delete(channelId);
                }
            }
        }
    }

    if (uncategorizedChannels.size > 0) {
        channelChoices.push(new Separator(chalk.bold.yellow('- Uncategorized -')));
        for (const channelId of uncategorizedChannels) {
            const channel = channels.get(channelId);
            if (channel) {
                channelChoices.push({ name: `#${channel.name}`, value: channel._id });
            }
        }
    }

    channelChoices.push(new Separator(), BACK_CHOICE);

    const { selectedChannelId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedChannelId',
            message: 'Select a channel:',
            choices: channelChoices,
            default: config.lastChannelId,
        },
    ]);

    return selectedChannelId;
}

const COMMANDS = [
    '/help',
    '/users',
    '/whoami',
    '/nick',
    '/profile',
    '/status',
    '/upload',
    '/reply',
    '/edit',
    '/delete',
    '/logout',
    '/leave',
    '/exit',
    '/config',
    '/userconfig',
    '/serverconfig',
    '/kick',
    '/ban',
    '/timeout',
    '/react',
    '/unreact',
    '/friends',
    '/note',
    '/clear',
];

function getTimestampFromUlid(ulid: string): number {
    const CrockfordBase32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const timeStr = ulid.substring(0, 10).toUpperCase();
    let time = 0;
    for (let i = 0; i < timeStr.length; i++) {
        const char = timeStr[i];
        const index = CrockfordBase32.indexOf(char);
        if (index === -1) return 0;
        time = time * 32 + index;
    }
    return time;
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

export async function promptMessage(channelName: string, typingUsers: string[]): Promise<string> {
    let typingIndicator = '';
    if (typingUsers.length > 0) {
        const names = typingUsers.slice(0, 3).join(', ');
        const extra = typingUsers.length > 3 ? ` and ${typingUsers.length - 3} others` : '';
        typingIndicator = chalk.italic.gray(`${names}${extra} are typing...`);
    }

    const { command } = await inquirer.prompt([
        {
            type: 'command',
            name: 'command',
            message: `\b${typingIndicator ? typingIndicator + '\n' : ''}${chalk.yellow(`[${channelName}]$`)}`,
            autoCompletion: COMMANDS,
            prefix: '',
        },
    ]);
    return command;
}

export async function promptFilePath(): Promise<string> {
    const { filePath } = await inquirer.prompt([
        {
            type: 'file-path',
            name: 'filePath',
            message: 'Select a file to upload:',
            basePath: process.cwd(),
        },
    ]);
    return filePath;
}

export async function displayPastMessages(messages: any[], users: Map<string, User>, channelName: string, selfId: string, bottomBar: any) {
  bottomBar.log.write(chalk.bold.yellow('\n--- Start of messages ---'));
  if (Array.isArray(messages)) {
    for (const msg of messages.reverse()) {
      const author = users.get(msg.author);
      const authorName = author ? `${author.username}#${author.discriminator}` : 'Unknown User';
      const displayName = author?.nickname || author?.displayName || (author ? author.username : 'Unknown');
      const timestamp = formatDate(new Date(getTimestampFromUlid(msg._id)));
      
      let formattedMessage;
      if (msg.author === selfId) {
          const self = users.get(selfId)!;
          const selfAuthorName = `${self.username}#${self.discriminator}`;
          const selfDisplayName = self.nickname || self.displayName || self.username;
          const channelStr = chalk.cyan(channelName);
          const userStr = chalk.blue(`${selfDisplayName}@${selfAuthorName}`);
          const idsStr = chalk.gray(`:${self._id} ${msg._id}`);
          const messageId = `[${channelStr} ${userStr}${idsStr}]$`;
          formattedMessage = `${messageId} ${await formatMessage(msg.content)} ${chalk.gray(timestamp)}`;
      } else {
          const channelStr = chalk.cyan(channelName);
          const userStr = chalk.blue(`${displayName}@${authorName}`);
          const idsStr = chalk.gray(`:${author?._id} ${msg._id}`);
          const messageId = `[${channelStr} ${userStr}${idsStr}]$`;
          const reactions = msg.reactions ? Object.entries(msg.reactions).map(([emoji, users]) => `${emoji}:${(users as any[]).length}`).join(' ') : '';
          formattedMessage = `${messageId} ${await formatMessage(msg.content)} ${chalk.yellow(reactions)} ${chalk.gray(timestamp)}`;
      }
      bottomBar.log.write(formattedMessage);
    }
  }
  bottomBar.log.write(chalk.bold.yellow('--- End of past messages ---'));
}