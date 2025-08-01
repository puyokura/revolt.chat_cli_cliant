
import chalk from 'chalk';
import { User, Channel } from './types';
import {
  uploadFile,
  sendMessage,
  editMessage,
  deleteMessage,
  fetchUserProfile,
  updateUserStatus,
  updateNickname,
  fetchServerMembers,
} from './api';
import { promptFilePath } from './ui';

function getPresence(user: User) {
    if (user.bot) return chalk.blue('[BOT]');
    if (user.online) return chalk.green('Online');
    return chalk.gray('Offline');
}

export function handleWhoami(self: User | null) {
  if (self) {
    console.log(chalk.bold.magenta('--- Your User Info ---'));
    console.log(`Username: ${chalk.cyan(self.username)}`);
    console.log(`ID: ${chalk.gray(self._id)}`);
    console.log(`Status: ${getPresence(self)}`);
    if (self.status?.text) {
      console.log(`  └ ${chalk.italic(self.status.text)}`);
    }
    console.log(chalk.bold.magenta('----------------------'));
  } else {
    console.log(chalk.yellow('Could not find your user information.'));
  }
}

export async function handleUsers(channel: Channel, token: string, users: Map<string, User>) {
  if (!channel.server) {
      console.log(chalk.yellow('This command is only available in server channels.'));
      return;
  }

  const { users: memberData } = await fetchServerMembers(channel.server, token);
  const members = memberData.map(m => users.get(m._id)).filter(Boolean) as User[];

  console.log(chalk.bold.magenta(`--- Users in #${channel.name} ---`));
  
  const onlineUsers = members.filter(u => u.online && !u.bot);
  const offlineUsers = members.filter(u => !u.online && !u.bot);
  const bots = members.filter(u => u.bot);

  if (onlineUsers.length > 0) {
      console.log(chalk.green('\n--- Online ---'));
      onlineUsers.forEach(user => {
          console.log(`- ${chalk.cyan(user.username)}`);
          if (user.status?.text) {
              console.log(`    └ ${chalk.italic(user.status.text)}`);
          }
      });
  }

  if (offlineUsers.length > 0) {
      console.log(chalk.gray('\n--- Offline ---'));
      offlineUsers.forEach(user => {
          console.log(`- ${chalk.cyan(user.username)}`);
      });
  }

  if (bots.length > 0) {
      console.log(chalk.blue('\n--- Bots ---'));
      bots.forEach(bot => {
          console.log(`- ${chalk.cyan(bot.username)}`);
      });
  }

  console.log(chalk.bold.magenta('\n-----------------------------------'));
}

export async function handleUpload(channelId: string, token: string) {
  const filePath = await promptFilePath();
  const attachmentId = await uploadFile(filePath, token);
  if (attachmentId) {
    await sendMessage(channelId, token, '', [attachmentId]);
    console.log(chalk.green('File uploaded successfully!'));
  }
}

export function handleHelp() {
  console.log(chalk.bold.magenta('--- Available Commands ---'));
  console.log(`${chalk.cyan('/help')}      - Shows this help message.`);
  console.log(`${chalk.cyan('/users')}     - Lists users in the current channel.`);
  console.log(`${chalk.cyan('/whoami')}   - Displays your user information.`);
  console.log(`${chalk.cyan('/nick <name>')} - Sets your server nickname.`);
  console.log(`${chalk.cyan('/profile <user>')} - Shows user profile.`);
  console.log(`${chalk.cyan('/status <pres> [msg]')} - Sets your status (online, idle, busy, invisible).`);
  console.log(`${chalk.cyan('/upload')}    - Uploads a file to the channel.`);
  console.log(`${chalk.cyan('/reply <id> <msg>')} - Replies to a message.`);
  console.log(`${chalk.cyan('/edit <id> <msg>')}  - Edits your message.`);
  console.log(`${chalk.cyan('/delete <id>')} - Deletes your message.`);
  console.log(`${chalk.cyan('/leave')}      - Leaves the current channel.`);
  console.log(`${chalk.cyan('/exit')}      - Exits the application.`);
  console.log(chalk.bold.magenta('------------------------'));
}

export async function handleNick(serverId: string, userId: string, token: string, args: string[]) {
    const nickname = args.join(' ');
    if (!nickname) {
        console.log(chalk.red('Usage: /nick <new_nickname>'));
        return;
    }
    await updateNickname(serverId, userId, token, nickname);
    console.log(chalk.green(`Nickname updated to "${nickname}".`));
}

export async function handleReply(channelId: string, token: string, args: string[]) {
  if (args.length < 2) {
    console.log(chalk.red('Usage: /reply <message_id> <content>'));
    return;
  }
  const messageId = args[0];
  const content = args.slice(1).join(' ');

  console.log(chalk.yellow(`Replying to message ${messageId}...`));

  await sendMessage(channelId, token, content, undefined, [{ id: messageId, mention: false }]);
  console.log(chalk.green('Reply sent!'));
}

export async function handleEdit(channelId: string, token: string, args: string[]) {
  if (args.length < 2) {
    console.log(chalk.red('Usage: /edit <message_id> <new_content>'));
    return;
  }
  const messageId = args[0];
  const content = args.slice(1).join(' ');

  await editMessage(channelId, messageId, token, content);
  console.log(chalk.green(`Message ${messageId} edited.`));
}

export async function handleDelete(channelId: string, token: string, args: string[]) {
  if (args.length < 1) {
    console.log(chalk.red('Usage: /delete <message_id>'));
    return;
  }
  const messageId = args[0];

  await deleteMessage(channelId, messageId, token);
  console.log(chalk.green(`Message ${messageId} deleted. (You may need to restart to see the change)`));
}

export async function handleProfile(token: string, username: string, users: Map<string, User>) {
    if (!username) {
        console.log(chalk.red('Usage: /profile <username>'));
        return;
    }
    const user = Array.from(users.values()).find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    console.log(chalk.red(`User "${username}" not found.`));
    return;
  }

  const profile = await fetchUserProfile(user._id, token);
  if (profile) {
    console.log(chalk.bold.magenta(`--- Profile: ${profile.username} ---`));
    console.log(`ID: ${chalk.gray(profile._id)}`);
    if (profile.nickname) {
        console.log(`Nickname: ${chalk.cyan(profile.nickname)}`);
    }
    console.log(`Status: ${getPresence(profile)}`);
    if (profile.status?.text) {
        console.log(`  └ ${chalk.italic(profile.status.text)}`);
    }
    if (profile.content) {
      console.log(chalk.bold.magenta('--- Bio ---'));
      console.log(profile.content);
      console.log(chalk.bold.magenta('-----------'));
    }
    if (profile.avatar) {
        const avatarUrl = `https://autumn.revolt.chat/avatars/${profile.avatar._id}`;
        console.log(`Avatar URL: ${chalk.blue(avatarUrl)}`);
    }
    console.log(chalk.bold.magenta('--------------------------------'));
  }
}

export async function handleStatus(token: string, args: string[]) {
  if (args.length < 1) {
    console.log(chalk.red('Usage: /status <online|idle|busy|invisible> [status message]'));
    return;
  }

  const presenceArg = args[0].toLowerCase();
  const validPresences = ['online', 'idle', 'busy', 'invisible'];
  
  if (!validPresences.includes(presenceArg)) {
    console.log(chalk.red(`Invalid presence. Use one of: ${validPresences.join(', ')}`));
    return;
  }

  const presence = presenceArg.charAt(0).toUpperCase() + presenceArg.slice(1) as 'Online' | 'Idle' | 'Busy' | 'Invisible';
  const text = args.slice(1).join(' ') || undefined;

  await updateUserStatus(token, { text, presence });
  console.log(chalk.green(`Status updated to ${presence}${text ? ` with message "${text}"` : ''}.`));
}
