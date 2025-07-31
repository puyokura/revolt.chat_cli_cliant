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
const fs_1 = __importDefault(require("fs"));
const package_json_1 = require("../package.json");
// --- Crash Reporter ---
process.on('uncaughtException', (error, origin) => {
    const logMessage = `
--- UNCAUGHT EXCEPTION ---
Timestamp: ${new Date().toISOString()}
Origin: ${origin}
Error: ${error.stack || error}
`;
    fs_1.default.writeFileSync(`${package_json_1.name}-crash-log.txt`, logMessage, { encoding: 'utf-8' });
    console.error('A critical error occurred. A crash log has been created.');
    process.exit(1);
});
// ----------------------
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const config_1 = require("./lib/config");
const api_1 = require("./lib/api");
const ui_1 = require("./lib/ui");
const commands_1 = require("./lib/commands");
const state = {
    users: new Map(),
    servers: new Map(),
    channels: new Map(),
    token: '',
    self: null,
    ws: null,
    currentChannelId: null,
};
function messageLoop(channel) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const input = yield promptMessage(channel.name);
        if (input.toLowerCase() === '/exit') {
            (_a = state.ws) === null || _a === void 0 ? void 0 : _a.close();
            return;
        }
        const command = input.toLowerCase().split(' ')[0];
        switch (command) {
            case '/whoami':
                (0, commands_1.handleWhoami)(state.self, state.users);
                break;
            case '/users':
                (0, commands_1.handleUsers)(channel._id, state.channels, state.users);
                break;
            case '/upload':
                yield (0, commands_1.handleUpload)(channel._id, state.token);
                break;
            case '/help':
                (0, commands_1.handleHelp)();
                break;
            case '/reply':
                yield (0, commands_1.handleReply)(channel._id, state.token, input.split(' ').slice(1));
                break;
            case '/edit':
                yield (0, commands_1.handleEdit)(channel._id, state.token, input.split(' ').slice(1));
                break;
            case '/delete':
                yield (0, commands_1.handleDelete)(channel._id, state.token, input.split(' ').slice(1));
                break;
            case '/profile':
                yield (0, commands_1.handleProfile)(state.token, input.split(' ')[1], state.users);
                break;
            case '/status':
                yield (0, commands_1.handleStatus)(state.token, input.split(' ').slice(1));
                break;
            case '/friends':
                yield (0, commands_1.handleFriends)(state.token, input.split(' ').slice(1), state.users);
                break;
            case '/leave':
                return;
            default:
                if (input.trim()) {
                    yield (0, api_1.sendMessage)(channel._id, state.token, input);
                    const pendingId = chalk_1.default.yellow(`[sending...]`);
                    const formattedInput = yield (0, ui_1.formatMessage)(input);
                    console.log(`\n${pendingId} ${chalk_1.default.bgGreen.black(` ${(_b = state.self) === null || _b === void 0 ? void 0 : _b.username} `)} ${formattedInput}`);
                }
                break;
        }
        messageLoop(channel);
    });
}
function channelSelectionLoop() {
    return __awaiter(this, void 0, void 0, function* () {
        const config = (0, config_1.readConfig)();
        const serverId = yield (0, ui_1.selectServer)(Array.from(state.servers.values()), config);
        const { users: memberData } = yield (0, api_1.fetchServerMembers)(serverId, state.token);
        memberData.forEach(member => state.users.set(member._id, member));
        const serverChannels = Array.from(state.channels.values()).filter(c => c.server === serverId);
        const channelId = yield (0, ui_1.selectChannel)(serverChannels, config);
        if (channelId === ui_1.BACK_CHOICE.value) {
            channelSelectionLoop(); // Go back to server selection
            return;
        }
        const selectedChannel = state.channels.get(channelId);
        config.lastServerId = serverId;
        config.lastChannelId = channelId;
        state.currentChannelId = channelId;
        (0, config_1.writeConfig)(config);
        console.log(chalk_1.default.green(`Joining channel: #${selectedChannel.name}`));
        const pastMessages = yield (0, api_1.fetchPastMessages)(channelId, state.token);
        yield (0, ui_1.displayPastMessages)(pastMessages, state.users);
        yield messageLoop(selectedChannel);
        channelSelectionLoop(); // Loop back to server selection after leaving a channel
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(chalk_1.default.blue('Revolt.chat CLI Client'));
        console.log(chalk_1.default.blue('======================'));
        console.log(chalk_1.default.gray('Type /help for a list of commands.'));
        let config = (0, config_1.readConfig)();
        state.token = config.token || null;
        if (!state.token) {
            const answers = yield inquirer_1.default.prompt([
                { type: 'input', name: 'email', message: 'Email:' },
                { type: 'password', name: 'password', message: 'Password:' },
            ]);
            try {
                state.token = yield (0, api_1.login)(answers.email, answers.password);
                config.token = state.token;
                (0, config_1.writeConfig)(config);
                console.log(chalk_1.default.green('Login successful! Token saved.'));
            }
            catch (error) {
                console.error(chalk_1.default.red(error.message));
                process.exit(1);
            }
        }
        else {
            console.log(chalk_1.default.green('Using saved token.'));
        }
        state.ws = (0, api_1.connectWebSocket)(state.token);
        state.ws.on('message', (data) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'Authenticated':
                    console.log(chalk_1.default.green('Successfully authenticated with WebSocket.'));
                    state.self = yield (0, api_1.fetchSelf)(state.token);
                    state.users.set(state.self._id, state.self);
                    break;
                case 'Ready':
                    console.log(chalk_1.default.cyan('Ready to chat!'));
                    const readyPayload = message;
                    readyPayload.users.forEach(user => state.users.set(user._id, user));
                    readyPayload.servers.forEach(server => state.servers.set(server._id, server));
                    readyPayload.channels.forEach(channel => state.channels.set(channel._id, channel));
                    channelSelectionLoop();
                    break;
                case 'Message': {
                    const msgPayload = message;
                    if (msgPayload.channel === state.currentChannelId && msgPayload.author !== ((_a = state.self) === null || _a === void 0 ? void 0 : _a._id)) {
                        const author = state.users.get(msgPayload.author);
                        const authorName = author ? author.username : 'Unknown User';
                        const messageId = chalk_1.default.gray(`[${msgPayload._id.slice(-6)}]`);
                        const formattedContent = yield (0, ui_1.formatMessage)(msgPayload.content);
                        console.log(`\n${messageId} ${chalk_1.default.bgCyan.black(` ${authorName} `)} ${formattedContent}`);
                    }
                    break;
                }
                case 'MessageUpdate': {
                    const updatePayload = message;
                    const updatedContent = yield (0, ui_1.formatMessage)(updatePayload.data.content);
                    console.log(chalk_1.default.italic.yellow(`\n[Message ${updatePayload.id.slice(-6)} updated] ${updatedContent}`));
                    break;
                }
                case 'MessageDelete': {
                    const deletePayload = message;
                    console.log(chalk_1.default.italic.red(`\n[Message ${deletePayload.id.slice(-6)} deleted]`));
                    break;
                }
            }
        }));
    });
}
main().catch(error => {
    console.error(chalk_1.default.red('An unexpected error occurred:', error.message));
    process.exit(1);
});
