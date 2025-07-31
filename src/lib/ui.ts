
import inquirer, { Separator } from 'inquirer';
import chalk from 'chalk';
import { Server, Channel, User } from './types';
import { Config } from './config';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import inquirerFilePath from 'inquirer-file-path';

inquirer.registerPrompt('file-path', inquirerFilePath);

marked.setOptions({
  renderer: new TerminalRenderer(),
});

export async function formatMessage(content: string): Promise<string> {
  if (typeof content !== 'string') {
    return ''; // or handle as you see fit
  }
  const blockquoteFormatted = content.replace(/^> (.*)$/gm, chalk.italic.gray('“$1”'));
  const formatted = await marked(blockquoteFormatted);
  return formatted.trim();
}

export const BACK_CHOICE = { name: '.. Go Back', value: '__BACK__' };

export async function selectServer(servers: Server[], config: Config): Promise<string> {
    const serverChoices = servers.map(server => ({ name: server.name, value: server._id }));
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

export async function selectChannel(channels: Channel[], config: Config): Promise<string> {
    const channelChoices = [
        ...channels.map(channel => ({ name: `#${channel.name}`, value: channel._id })),
        new Separator(),
        BACK_CHOICE,
    ];

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

export async function promptMultiLineMessage(channelName: string): Promise<string> {
  console.log(chalk.italic.gray('Enter message. Press Enter on an empty line to send. Type /exit to quit.'));
  let lines: string[] = [];
  while (true) {
    const { line } = await inquirer.prompt([
      {
        type: 'input',
        name: 'line',
        message: chalk.yellow(`[${channelName}]> `),
      },
    ]);

    if (line.trim().toLowerCase() === '/exit') {
        return '/exit';
    }

    if (line.trim() === '') {
      break;
    }

    if (line.trim().startsWith('/')) {
      return line.trim();
    }

    lines.push(line);
  }
  return lines.join('\n');
}

export async function promptFilePath(): Promise<string> {
    const { filePath } = await inquirer.prompt([
        {
            type: 'file-path',
            name: 'filePath',
            message: 'Select a file to upload:',
            basePath: process.cwd(), // Start in the current directory
        },
    ]);
    return filePath;
}

export async function displayPastMessages(messages: any[], users: Map<string, User>) {
  console.log(chalk.bold.yellow('\n--- Start of messages ---'));
  if (Array.isArray(messages)) {
    for (const msg of messages.reverse()) {
      const author = users.get(msg.author);
      const authorName = author ? author.username : 'Unknown User';
      const messageId = chalk.gray(`[${msg._id.slice(-6)}]`);
      const formattedContent = await formatMessage(msg.content);
      console.log(`${messageId} ${chalk.bgCyan.black(` ${authorName} `)} ${formattedContent}`);
    }
  }
  console.log(chalk.bold.yellow('--- End of past messages ---'));
}
