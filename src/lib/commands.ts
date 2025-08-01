import chalk from 'chalk';
import { User, Channel, Server, Role } from './types';
import {
  uploadFile,
  sendMessage,
  editMessage,
  deleteMessage,
  fetchUserProfile,
  updateUserStatus,
  updateNickname,
  fetchServerMembers,
  kickUser,
  banUser,
  updateUserRoles,
  createRole,
} from './api';
import { promptFilePath } from './ui';
import { clearConfig, readConfig, writeConfig } from './config';

function getPresence(user: User) {
    if (user.bot) return chalk.blue('[BOT]');
    if (user.online) return chalk.green('Online');
    return chalk.gray('Offline');
}

function findMessageId(shortId: string, messageCache: any[]): string | null {
    const message = messageCache.find(m => m._id.slice(-6) === shortId);
    return message ? message._id : null;
}

function displayUserRoles(user: User, server: Server) {
    if (user.roles && server.roles) {
        const userRoles = user.roles
            .map(roleId => server.roles![roleId])
            .filter(Boolean)
            .map(role => chalk.hex(role.colour || '#FFFFFF')(`[${role.name}]`));
        if (userRoles.length > 0) {
            return ' ' + userRoles.join(' ');
        }
    }
    return '';
}

function hasPermission(user: User, server: Server, permission: string) {
    if (!user.roles || !server.roles) return false;
    // This is a simplified check. A real implementation would need to resolve permission overwrites.
    return user.roles.some(roleId => {
        const role = server.roles![roleId];
        // @ts-ignore
        return role && role.permissions[permission];
    });
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

export async function handleUsers(server: Server, users: Map<string, User>) {
    console.log(chalk.bold.magenta(`--- Users in ${server.name} ---`));

    const roleGroups: { [key: string]: User[] } = {};
    const usersWithNoRoles: User[] = [];

    const members = Array.from(users.values()).filter(u => u.roles);

    for (const user of members) {
        if (user.roles && user.roles.length > 0) {
            const primaryRoleId = user.roles[0]; // Simple grouping by first role
            if (!roleGroups[primaryRoleId]) {
                roleGroups[primaryRoleId] = [];
            }
            roleGroups[primaryRoleId].push(user);
        } else {
            usersWithNoRoles.push(user);
        }
    }

    const sortedRoleIds = Object.keys(roleGroups).sort((a, b) => {
        const roleA = server.roles?.[a];
        const roleB = server.roles?.[b];
        // A simple sort, can be improved with rank property if available
        return (roleA?.name || '').localeCompare(roleB?.name || '');
    });

    for (const roleId of sortedRoleIds) {
        const role = server.roles?.[roleId];
        if (role) {
            console.log(chalk.hex(role.colour || '#FFFFFF').bold(`\n--- ${role.name} ---`));
            for (const user of roleGroups[roleId]) {
                console.log(`- ${chalk.cyan(user.username)} ${getPresence(user)}`);
            }
        }
    }

    if (usersWithNoRoles.length > 0) {
        console.log(chalk.bold(`\n--- No Roles ---`));
        for (const user of usersWithNoRoles) {
            console.log(`- ${chalk.cyan(user.username)} ${getPresence(user)}`);
        }
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
  console.log(`${chalk.cyan('/help')}                    - Shows this help message.`);
  console.log(`${chalk.cyan('/users')}                   - Lists users in the current server.`);
  console.log(`${chalk.cyan('/whoami')}                 - Displays your user information.`);
  console.log(`${chalk.cyan('/nick <name>')}             - Sets your server nickname.`);
  console.log(`${chalk.cyan('/profile <user>')}          - Shows user profile.`);
  console.log(`${chalk.cyan('/status <pres> [msg]')}    - Sets your status (online, idle, busy, invisible).`);
  console.log(`${chalk.cyan('/upload')}                  - Uploads a file to the channel.`);
  console.log(`${chalk.cyan('/reply <id> <msg>')}        - Replies to a message.`);
  console.log(`${chalk.cyan('/edit <id> <msg>')}         - Edits your message.`);
  console.log(`${chalk.cyan('/delete <id>')}              - Deletes your message.`);
  console.log(`${chalk.cyan('/logout')}                  - Deletes session token and exits.`);
  console.log(`${chalk.cyan('/config [key] [val]')}      - Views or edits CLI configuration.`);
  console.log(`${chalk.cyan('/userconfig')}              - Views your user configuration.`);
  console.log(`${chalk.cyan('/serverconfig')}            - Views server configuration.`);
  console.log(chalk.bold.magenta('--- Moderation Commands ---'));
  console.log(`${chalk.cyan('/kick <user>')}              - Kicks a user from the server.`);
  console.log(`${chalk.cyan('/ban <user> [reason]')}     - Bans a user from the server.`);
  console.log(`${chalk.cyan('/timeout <user> <time_s>')} - Mutes a user for a specified time.`);
  console.log(chalk.bold.magenta('--- Navigation ---'));
  console.log(`${chalk.cyan('/leave')}                    - Leaves the current channel.`);
  console.log(`${chalk.cyan('/exit')}                    - Exits the application.`);
  console.log(chalk.bold.magenta('------------------------'));
}

export function handleLogout() {
    clearConfig();
    console.log(chalk.green('Logged out. Session token has been cleared.'));
}

export function handleUserConfig(self: User | null) {
    if (self) {
        console.log(chalk.bold.magenta('--- Your User Configuration ---'));
        console.log(`Username: ${chalk.cyan(self.username)}`);
        console.log(`Status Text: ${chalk.cyan(self.status?.text || '')}`);
        // Add more fields as they become available/editable
        console.log(chalk.bold.magenta('-----------------------------'));
    } else {
        console.log(chalk.yellow('Could not find your user information.'));
    }
}

export function handleServerConfig(server: Server | null) {
    if (server) {
        console.log(chalk.bold.magenta(`--- Server Configuration: ${server.name} ---`));
        console.log(`ID: ${chalk.gray(server._id)}`);
        // Add more fields as they become available/editable
        console.log(chalk.bold.magenta('------------------------------------------'));
    } else {
        console.log(chalk.yellow('Could not find server information.'));
    }
}

export function handleConfig(args: string[]) {
    const config = readConfig();
    const [key, value] = args;

    if (!key) {
        console.log(chalk.bold.magenta('--- CLI Configuration ---'));
        console.log(`Show Timestamps: ${chalk.cyan(config.showTimestamps)}`);
        console.log(chalk.bold.magenta('-------------------------'));
        return;
    }

    if (key === 'showTimestamps') {
        const boolValue = value === 'true';
        config.showTimestamps = boolValue;
        writeConfig(config);
        console.log(chalk.green(`Set showTimestamps to: ${boolValue}`));
    } else {
        console.log(chalk.red(`Unknown config key: ${key}`));
    }
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

export async function handleKick(args: string[], self: User, server: Server, users: Map<string, User>, token: string) {
    if (!hasPermission(self, server, 'KickMembers')) {
        console.log(chalk.red('You do not have permission to kick members.'));
        return;
    }
    const username = args[0];
    if (!username) {
        console.log(chalk.red('Usage: /kick <username>'));
        return;
    }
    const userToKick = Array.from(users.values()).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!userToKick) {
        console.log(chalk.red(`User "${username}" not found.`));
        return;
    }
    const success = await kickUser(server._id, userToKick._id, token);
    if (success) {
        console.log(chalk.green(`User "${username}" has been kicked.`));
    }
}

export async function handleBan(args: string[], self: User, server: Server, users: Map<string, User>, token: string) {
    if (!hasPermission(self, server, 'BanMembers')) {
        console.log(chalk.red('You do not have permission to ban members.'));
        return;
    }
    const username = args[0];
    if (!username) {
        console.log(chalk.red('Usage: /ban <username> [reason]'));
        return;
    }
    const userToBan = Array.from(users.values()).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!userToBan) {
        console.log(chalk.red(`User "${username}" not found.`));
        return;
    }
    const reason = args.slice(1).join(' ');
    const success = await banUser(server._id, userToBan._id, token, reason);
    if (success) {
        console.log(chalk.green(`User "${username}" has been banned.`));
    }
}

export async function handleTimeout(args: string[], self: User, server: Server, users: Map<string, User>, token: string) {
    if (!hasPermission(self, server, 'ManageRole')) {
        console.log(chalk.red('You do not have permission to manage roles for timeout.'));
        return;
    }
    const username = args[0];
    const duration = parseInt(args[1], 10);
    if (!username || !duration) {
        console.log(chalk.red('Usage: /timeout <username> <duration_in_seconds>'));
        return;
    }

    const userToMuzzle = Array.from(users.values()).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!userToMuzzle) {
        console.log(chalk.red(`User "${username}" not found.`));
        return;
    }

    let muzzledRole = Object.values(server.roles || {}).find(r => r.name === 'Muzzled');
    if (!muzzledRole) {
        console.log(chalk.yellow('Muzzled role not found, creating it...'));
        const newRole = await createRole(server._id, token, 'Muzzled', { send_message: false, invite: false });
        if (!newRole) {
            console.log(chalk.red('Failed to create Muzzled role.'));
            return;
        }
        muzzledRole = newRole;
    }

    const originalRoles = userToMuzzle.roles || [];
    const newRoles = [...originalRoles, muzzledRole._id];

    await updateUserRoles(server._id, userToMuzzle._id, token, newRoles);
    console.log(chalk.green(`User "${username}" has been timed out for ${duration} seconds.`));

    setTimeout(async () => {
        await updateUserRoles(server._id, userToMuzzle._id, token, originalRoles);
        console.log(chalk.green(`User "${username}" is no longer timed out.`));
    }, duration * 1000);
}

export async function handleReply(channelId: string, token: string, args: string[], messageCache: any[]) {
  if (args.length < 2) {
    console.log(chalk.red('Usage: /reply <message_id> <content>'));
    return;
  }
  const shortId = args[0];
  const fullId = findMessageId(shortId, messageCache);
  if (!fullId) {
      console.log(chalk.red(`Message with ID ending in "${shortId}" not found in recent history.`));
      return;
  }
  const content = args.slice(1).join(' ');

  console.log(chalk.yellow(`Replying to message ${shortId}...`));

  await sendMessage(channelId, token, content, undefined, [{ id: fullId, mention: false }]);
  console.log(chalk.green('Reply sent!'));
}

export async function handleEdit(channelId: string, token: string, args: string[], messageCache: any[]) {
  if (args.length < 2) {
    console.log(chalk.red('Usage: /edit <message_id> <new_content>'));
    return;
  }
  const shortId = args[0];
  const fullId = findMessageId(shortId, messageCache);
    if (!fullId) {
        console.log(chalk.red(`Message with ID ending in "${shortId}" not found in recent history.`));
        return;
    }
  const content = args.slice(1).join(' ');

  await editMessage(channelId, fullId, token, content);
  console.log(chalk.green(`Message ${shortId} edited.`));
}

export async function handleDelete(channelId: string, token: string, args: string[], messageCache: any[]) {
  if (args.length < 1) {
    console.log(chalk.red('Usage: /delete <message_id>'));
    return;
  }
  const shortId = args[0];
  const fullId = findMessageId(shortId, messageCache);
    if (!fullId) {
        console.log(chalk.red(`Message with ID ending in "${shortId}" not found in recent history.`));
        return;
    }

  await deleteMessage(channelId, fullId, token);
  console.log(chalk.green(`Message ${shortId} deleted.`));
}

export async function handleProfile(token: string, username: string, users: Map<string, User>, server: Server) {
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
    console.log(`Roles: ${displayUserRoles(user, server)}`);
    if (profile.profile?.content) {
      console.log(chalk.bold.magenta('--- Bio ---'));
      console.log(profile.profile.content);
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