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
];

export async function promptMessage(channelName: string, typingUsers: string[]): Promise<string> {
    let typingIndicator = '';
    if (typingUsers.length > 0) {
        const names = typingUsers.slice(0, 3).join(', ');
        const extra = typingUsers.length > 3 ? ` and ${typingUsers.length - 3} others` : '';
        typingIndicator = chalk.italic.gray(`\n${names}${extra} are typing...`);
    }

    const { command } = await inquirer.prompt([
        {
            type: 'command',
            name: 'command',
            message: `${typingIndicator}\n${chalk.yellow(`[${channelName}]$`)}`,
            autoCompletion: COMMANDS,
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

export async function displayPastMessages(messages: any[], users: Map<string, User>, channelName: string) {
  const config = readConfig();
  console.log(chalk.bold.yellow('\n--- Start of messages ---'));
  if (Array.isArray(messages)) {
    for (const msg of messages.reverse()) {
      const author = users.get(msg.author);
      const authorName = author ? author.username : 'Unknown User';
      const displayName = author?.displayName || authorName;
      const timestamp = new Date(msg.createdAt).toLocaleString();
      const messageId = chalk.gray(`[${channelName} ${displayName}@${authorName}:${author?._id} ${msg._id}]$`);
      const formattedContent = await formatMessage(msg.content);
      const reactions = msg.reactions ? Object.entries(msg.reactions).map(([emoji, users]) => `${emoji}:${(users as any[]).length}`).join(' ') : '';
      console.log(`${messageId} ${formattedContent} ${chalk.yellow(reactions)} ${chalk.gray(timestamp)}`);
    }
  }
  console.log(chalk.bold.yellow('--- End of past messages ---'));
}