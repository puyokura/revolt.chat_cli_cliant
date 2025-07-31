"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.BACK_CHOICE = void 0;
exports.formatMessage = formatMessage;
exports.selectServer = selectServer;
exports.selectChannel = selectChannel;
exports.promptMessage = promptMessage;
exports.promptFilePath = promptFilePath;
exports.displayPastMessages = displayPastMessages;
const inquirer_1 = __importStar(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const marked_1 = require("marked");
const marked_terminal_1 = __importDefault(require("marked-terminal"));
const inquirer_file_path_1 = __importDefault(require("inquirer-file-path"));
const inquirer_command_prompt_1 = __importDefault(require("inquirer-command-prompt"));
inquirer_1.default.registerPrompt('file-path', inquirer_file_path_1.default);
inquirer_1.default.registerPrompt('command', inquirer_command_prompt_1.default);
marked_1.marked.setOptions({
    renderer: new marked_terminal_1.default(),
});
function formatMessage(content) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof content !== 'string') {
            return '';
        }
        const blockquoteFormatted = content.replace(/^> (.*)$/gm, chalk_1.default.italic.gray('“$1”'));
        const formatted = yield (0, marked_1.marked)(blockquoteFormatted);
        return formatted.trim();
    });
}
exports.BACK_CHOICE = { name: '.. Go Back', value: '__BACK__' };
function selectServer(servers, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const serverChoices = servers.map(server => ({ name: server.name, value: server._id }));
        const { selectedServerId } = yield inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'selectedServerId',
                message: 'Select a server:',
                choices: serverChoices,
                default: config.lastServerId,
            },
        ]);
        return selectedServerId;
    });
}
function selectChannel(channels, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const channelChoices = [
            ...channels.map(channel => ({ name: `#${channel.name}`, value: channel._id })),
            new inquirer_1.Separator(),
            exports.BACK_CHOICE,
        ];
        const { selectedChannelId } = yield inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'selectedChannelId',
                message: 'Select a channel:',
                choices: channelChoices,
                default: config.lastChannelId,
            },
        ]);
        return selectedChannelId;
    });
}
function promptMessage(channelName) {
    return __awaiter(this, void 0, void 0, function* () {
        const { command } = yield inquirer_1.default.prompt([
            {
                type: 'command',
                name: 'command',
                message: chalk_1.default.yellow(`[${channelName}]> `),
                autoCompletion: [], // You can add auto-completion for commands here
            },
        ]);
        return command;
    });
}
function promptFilePath() {
    return __awaiter(this, void 0, void 0, function* () {
        const { filePath } = yield inquirer_1.default.prompt([
            {
                type: 'file-path',
                name: 'filePath',
                message: 'Select a file to upload:',
                basePath: process.cwd(),
            },
        ]);
        return filePath;
    });
}
function displayPastMessages(messages, users) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(chalk_1.default.bold.yellow('\n--- Start of messages ---'));
        if (Array.isArray(messages)) {
            for (const msg of messages.reverse()) {
                const author = users.get(msg.author);
                const authorName = author ? author.username : 'Unknown User';
                const messageId = chalk_1.default.gray(`[${msg._id.slice(-6)}]`);
                const formattedContent = yield formatMessage(msg.content);
                console.log(`${messageId} ${chalk_1.default.bgCyan.black(` ${authorName} `)} ${formattedContent}`);
            }
        }
        console.log(chalk_1.default.bold.yellow('--- End of past messages ---'));
    });
}
