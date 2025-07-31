"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWhoami = handleWhoami;
exports.handleUsers = handleUsers;
exports.handleUpload = handleUpload;
exports.handleHelp = handleHelp;
exports.handleReply = handleReply;
exports.handleEdit = handleEdit;
exports.handleDelete = handleDelete;
exports.handleProfile = handleProfile;
exports.handleStatus = handleStatus;
exports.handleFriends = handleFriends;
const chalk_1 = __importDefault(require("chalk"));
const api_1 = require("./api");
const ui_1 = require("./ui");
function getPresence(user) {
    if (user.bot)
        return chalk_1.default.blue('[BOT]');
    if (user.online)
        return chalk_1.default.green('Online');
    return chalk_1.default.gray('Offline');
}
function handleWhoami(self, users) {
    var _a;
    if (self) {
        console.log(chalk_1.default.bold.magenta('--- Your User Info ---'));
        console.log(`Username: ${chalk_1.default.cyan(self.username)}`);
        console.log(`ID: ${chalk_1.default.gray(self._id)}`);
        console.log(`Status: ${getPresence(self)}`);
        if ((_a = self.status) === null || _a === void 0 ? void 0 : _a.text) {
            console.log(`  └ ${chalk_1.default.italic(self.status.text)}`);
        }
        console.log(chalk_1.default.bold.magenta('----------------------'));
    }
    else {
        console.log(chalk_1.default.yellow('Could not find your user information.'));
    }
}
function handleUsers(channelId, channels, users) {
    const currentChannel = channels.get(channelId);
    if (currentChannel === null || currentChannel === void 0 ? void 0 : currentChannel.recipients) {
        console.log(chalk_1.default.bold.magenta(`--- Users in #${currentChannel.name} ---`));
        const onlineUsers = currentChannel.recipients.map(id => users.get(id)).filter(u => u && u.online && !u.bot);
        const offlineUsers = currentChannel.recipients.map(id => users.get(id)).filter(u => u && !u.online && !u.bot);
        const bots = currentChannel.recipients.map(id => users.get(id)).filter(u => u && u.bot);
        if (onlineUsers.length > 0) {
            console.log(chalk_1.default.green('\n--- Online ---'));
            onlineUsers.forEach(user => {
                var _a;
                console.log(`- ${chalk_1.default.cyan(user.username)}`);
                if ((_a = user.status) === null || _a === void 0 ? void 0 : _a.text) {
                    console.log(`    └ ${chalk_1.default.italic(user.status.text)}`);
                }
            });
        }
        if (offlineUsers.length > 0) {
            console.log(chalk_1.default.gray('\n--- Offline ---'));
            offlineUsers.forEach(user => {
                console.log(`- ${chalk_1.default.cyan(user.username)}`);
            });
        }
        if (bots.length > 0) {
            console.log(chalk_1.default.blue('\n--- Bots ---'));
            bots.forEach(bot => {
                console.log(`- ${chalk_1.default.cyan(bot.username)}`);
            });
        }
        console.log(chalk_1.default.bold.magenta('\n-----------------------------------'));
    }
    else {
        console.log(chalk_1.default.yellow('Could not retrieve user list for this channel.'));
    }
}
function handleUpload(channelId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = yield (0, ui_1.promptFilePath)();
        const attachmentId = yield (0, api_1.uploadFile)(filePath);
        if (attachmentId) {
            yield (0, api_1.sendMessage)(channelId, token, '', [attachmentId]);
            console.log(chalk_1.default.green('File uploaded successfully!'));
        }
    });
}
function handleHelp() {
    console.log(chalk_1.default.bold.magenta('--- Available Commands ---'));
    console.log(`${chalk_1.default.cyan('/help')}      - Shows this help message.`);
    console.log(`${chalk_1.default.cyan('/reply <id> <msg>')} - Replies to a message.`);
    console.log(`${chalk_1.default.cyan('/edit <id> <msg>')}  - Edits your message.`);
    console.log(`${chalk_1.default.cyan('/delete <id>')} - Deletes your message.`);
    console.log(`${chalk_1.default.cyan('/profile <user>')} - Shows user profile.`);
    console.log(`${chalk_1.default.cyan('/status <pres> [msg]')} - Sets your status (online, idle, busy, invisible).`);
    console.log(`${chalk_1.default.cyan('/friends <cmd> [user]')} - Manages friends (list, add, remove).`);
    console.log(`${chalk_1.default.cyan('/whoami')}   - Displays your user information.`);
    console.log(`${chalk_1.default.cyan('/users')}     - Lists users in the current channel.`);
    console.log(`${chalk_1.default.cyan('/upload')}    - Uploads a file to the channel.`);
    console.log(`${chalk_1.default.cyan('/leave')}      - Leaves the current channel.`);
    console.log(`${chalk_1.default.cyan('/exit')}      - Exits the application.`);
    console.log(chalk_1.default.bold.magenta('------------------------'));
}
function handleReply(channelId, token, args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (args.length < 2) {
            console.log(chalk_1.default.red('Usage: /reply <message_id> <content>'));
            return;
        }
        const messageId = args[0];
        const content = args.slice(1).join(' ');
        console.log(chalk_1.default.yellow(`Replying to message ${messageId}...`));
        yield (0, api_1.sendMessage)(channelId, token, content, undefined, [{ id: messageId, mention: false }]);
        console.log(chalk_1.default.green('Reply sent!'));
    });
}
function handleEdit(channelId, token, args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (args.length < 2) {
            console.log(chalk_1.default.red('Usage: /edit <message_id> <new_content>'));
            return;
        }
        const messageId = args[0];
        const content = args.slice(1).join(' ');
        yield (0, api_1.editMessage)(channelId, messageId, token, content);
        console.log(chalk_1.default.green(`Message ${messageId} edited.`));
    });
}
function handleDelete(channelId, token, args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (args.length < 1) {
            console.log(chalk_1.default.red('Usage: /delete <message_id>'));
            return;
        }
        const messageId = args[0];
        yield (0, api_1.deleteMessage)(channelId, messageId, token);
        console.log(chalk_1.default.green(`Message ${messageId} deleted. (You may need to restart to see the change)`));
    });
}
function handleProfile(token, username, users) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!username) {
            console.log(chalk_1.default.red('Usage: /profile <username>'));
            return;
        }
        const user = Array.from(users.values()).find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
            console.log(chalk_1.default.red(`User "${username}" not found.`));
            return;
        }
        const profile = yield (0, api_1.fetchUserProfile)(user._id, token);
        if (profile) {
            console.log(chalk_1.default.bold.magenta(`--- Profile: ${profile.username} ---`));
            console.log(`ID: ${chalk_1.default.gray(profile._id)}`);
            console.log(`Status: ${chalk_1.default.cyan(((_a = profile.status) === null || _a === void 0 ? void 0 : _a.text) || 'Not set')}`);
            if ((_b = profile.profile) === null || _b === void 0 ? void 0 : _b.content) {
                console.log(chalk_1.default.bold.magenta('--- Bio ---'));
                console.log(profile.profile.content);
                console.log(chalk_1.default.bold.magenta('-----------'));
            }
            if (profile.avatar) {
                const avatarUrl = `https://autumn.revolt.chat/avatars/${profile.avatar._id}`;
                console.log(`Avatar URL: ${chalk_1.default.blue(avatarUrl)}`);
            }
            console.log(chalk_1.default.bold.magenta('--------------------------------'));
        }
    });
}
function handleStatus(token, args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (args.length < 1) {
            console.log(chalk_1.default.red('Usage: /status <online|idle|busy|invisible> [status message]'));
            return;
        }
        const presenceArg = args[0].toLowerCase();
        const validPresences = ['online', 'idle', 'busy', 'invisible'];
        if (!validPresences.includes(presenceArg)) {
            console.log(chalk_1.default.red(`Invalid presence. Use one of: ${validPresences.join(', ')}`));
            return;
        }
        const presence = presenceArg.charAt(0).toUpperCase() + presenceArg.slice(1);
        const text = args.slice(1).join(' ') || undefined;
        yield (0, api_1.updateUserStatus)(token, { text, presence });
        console.log(chalk_1.default.green(`Status updated to ${presence}${text ? ` with message "${text}"` : ''}.`));
    });
}
function handleFriends(token, args, users) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const subCommand = (_a = args[0]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        const usernameArg = (_b = args[1]) === null || _b === void 0 ? void 0 : _b.toLowerCase();
        switch (subCommand) {
            case 'list':
                const friends = yield (0, api_1.fetchFriends)(token);
                console.log(chalk_1.default.bold.magenta('--- Friends ---'));
                if (friends.length > 0) {
                    friends.forEach(friend => {
                        console.log(`- ${chalk_1.default.cyan(friend.username)} (${getPresence(friend)})`);
                    });
                }
                else {
                    console.log(chalk_1.default.gray('You have no friends yet.'));
                }
                console.log(chalk_1.default.bold.magenta('---------------'));
                break;
            case 'add':
                if (!usernameArg) {
                    console.log(chalk_1.default.red('Usage: /friends add <username>'));
                    return;
                }
                const addUser = Array.from(users.values()).find(u => u.username.toLowerCase() === usernameArg);
                if (!addUser) {
                    console.log(chalk_1.default.red(`User "${usernameArg}" not found.`));
                    return;
                }
                yield (0, api_1.addFriend)(addUser._id, token);
                console.log(chalk_1.default.green(`Friend request sent to ${addUser.username}.`));
                break;
            case 'remove':
                if (!usernameArg) {
                    console.log(chalk_1.default.red('Usage: /friends remove <username>'));
                    return;
                }
                const removeUser = Array.from(users.values()).find(u => u.username.toLowerCase() === usernameArg);
                if (!removeUser) {
                    console.log(chalk_1.default.red(`User "${usernameArg}" not found.`));
                    return;
                }
                yield (0, api_1.removeFriend)(removeUser._id, token);
                console.log(chalk_1.default.green(`Removed ${removeUser.username} from friends.`));
                break;
            default:
                console.log(chalk_1.default.red('Usage: /friends <list|add|remove> [username]'));
                break;
        }
    });
}
