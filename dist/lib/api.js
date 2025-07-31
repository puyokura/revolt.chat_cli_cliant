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
exports.login = login;
exports.connectWebSocket = connectWebSocket;
exports.fetchSelf = fetchSelf;
exports.fetchServerMembers = fetchServerMembers;
exports.fetchPastMessages = fetchPastMessages;
exports.sendMessage = sendMessage;
exports.editMessage = editMessage;
exports.deleteMessage = deleteMessage;
exports.uploadFile = uploadFile;
exports.fetchUserProfile = fetchUserProfile;
exports.updateUserStatus = updateUserStatus;
exports.fetchFriends = fetchFriends;
exports.addFriend = addFriend;
exports.removeFriend = removeFriend;
const axios_1 = __importDefault(require("axios"));
const ws_1 = __importDefault(require("ws"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const API_URL = 'https://api.revolt.chat';
const AUTUMN_URL = 'https://autumn.revolt.chat';
/**
 * Revolt APIにログインし、認証トークンを取得します。
 */
function login(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield axios_1.default.post(`${API_URL}/auth/session/login`, { email, password });
            return response.data.token;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                throw new Error(`Login failed: ${((_b = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || axiosError.message}`);
            }
            throw new Error(`Login failed: ${error.message}`);
        }
    });
}
/**
 * WebSocketに接続し、認証します。
 */
function connectWebSocket(token) {
    const ws = new ws_1.default('wss://ws.revolt.chat');
    ws.on('open', () => {
        console.log(chalk_1.default.blue('Connecting to Revolt...'));
        ws.send(JSON.stringify({ type: 'Authenticate', token }));
    });
    const pingInterval = setInterval(() => {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify({ type: 'Ping', data: 0 }));
        }
    }, 20000);
    ws.on('close', () => {
        console.log(chalk_1.default.yellow('Disconnected from Revolt.'));
        clearInterval(pingInterval);
        process.exit(0);
    });
    ws.on('error', (error) => {
        console.error(chalk_1.default.red('WebSocket error:', error.message));
        clearInterval(pingInterval);
        process.exit(1);
    });
    return ws;
}
/**
 * 自身のユーザー情報を取得します。
 */
function fetchSelf(token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${API_URL}/users/@me`, {
                headers: { 'x-session-token': token },
            });
            return response.data;
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to fetch self user data.'));
            throw error;
        }
    });
}
/**
 * 指定されたサーバーのメンバーリストを取得します。
 */
function fetchServerMembers(serverId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${API_URL}/servers/${serverId}/members`, {
                headers: { 'x-session-token': token },
            });
            return response.data;
        }
        catch (error) {
            console.error(chalk_1.default.red(`Failed to fetch members for server ${serverId}.`));
            return { users: [] };
        }
    });
}
/**
 * 指定されたチャンネルの過去のメッセージを取得します。
 */
function fetchPastMessages(channelId_1, token_1) {
    return __awaiter(this, arguments, void 0, function* (channelId, token, limit = 20) {
        try {
            const response = yield axios_1.default.get(`${API_URL}/channels/${channelId}/messages`, {
                headers: { 'x-session-token': token },
                params: { limit },
            });
            return response.data.messages || [];
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to fetch past messages.'));
            return [];
        }
    });
}
/**
 * チャンネルにメッセージを送信します。
 */
function sendMessage(channelId, token, content, attachments, replies) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const payload = { content };
            if (attachments && attachments.length > 0) {
                payload.attachments = attachments;
            }
            if (replies && replies.length > 0) {
                payload.replies = replies;
            }
            yield axios_1.default.post(`${API_URL}/channels/${channelId}/messages`, payload, { headers: { 'x-session-token': token } });
        }
        catch (error) {
            console.error(chalk_1.default.red('--- FAILED TO SEND MESSAGE ---'));
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                console.error(chalk_1.default.red('Status:'), (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status);
                console.error(chalk_1.default.red('Data:'), JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data, null, 2));
                console.error(chalk_1.default.red('Message:'), axiosError.message);
            }
            else {
                console.error(chalk_1.default.red('Unexpected Error:'), error.message);
            }
            console.error(chalk_1.default.red('------------------------------'));
        }
    });
}
/**
 * チャンネルのメッセージを編集します。
 */
function editMessage(channelId, messageId, token, content) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            yield axios_1.default.patch(`${API_URL}/channels/${channelId}/messages/${messageId}`, { content }, { headers: { 'x-session-token': token } });
        }
        catch (error) {
            console.error(chalk_1.default.red('--- FAILED TO EDIT MESSAGE ---'));
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                console.error(chalk_1.default.red('Status:'), (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status);
                console.error(chalk_1.default.red('Data:'), JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data, null, 2));
            }
            else {
                console.error(chalk_1.default.red('Unexpected Error:'), error.message);
            }
            console.error(chalk_1.default.red('----------------------------'));
        }
    });
}
/**
 * チャンネルのメッセージを削除します。
 */
function deleteMessage(channelId, messageId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            yield axios_1.default.delete(`${API_URL}/channels/${channelId}/messages/${messageId}`, {
                headers: { 'x-session-token': token },
            });
        }
        catch (error) {
            console.error(chalk_1.default.red('--- FAILED TO DELETE MESSAGE ---'));
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                console.error(chalk_1.default.red('Status:'), (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status);
                console.error(chalk_1.default.red('Data:'), JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data, null, 2));
            }
            else {
                console.error(chalk_1.default.red('Unexpected Error:'), error.message);
            }
            console.error(chalk_1.default.red('------------------------------'));
        }
    });
}
/**
 * ファイルをAutumnにアップロードし、添付ファイルIDを取得します。
 */
function uploadFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!fs_1.default.existsSync(filePath)) {
                console.error(chalk_1.default.red('File not found at the specified path.'));
                return null;
            }
            const form = new form_data_1.default();
            form.append('file', fs_1.default.createReadStream(filePath));
            const uploadResponse = yield axios_1.default.post(`${AUTUMN_URL}/attachments`, form, {
                headers: Object.assign({}, form.getHeaders()),
            });
            return uploadResponse.data.id;
        }
        catch (error) {
            console.error(chalk_1.default.red('File upload failed:', error.message));
            return null;
        }
    });
}
/**
 * ユーザープロフィールを取得します。
 */
function fetchUserProfile(userId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${API_URL}/users/${userId}`, {
                headers: { 'x-session-token': token },
            });
            return response.data;
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to fetch user profile.'));
            return null;
        }
    });
}
/**
 * 自身のステータスを更新します。
 */
function updateUserStatus(token, status) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            yield axios_1.default.patch(`${API_URL}/users/@me`, { status }, { headers: { 'x-session-token': token } });
        }
        catch (error) {
            console.error(chalk_1.default.red('--- FAILED TO UPDATE STATUS ---'));
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                console.error(chalk_1.default.red('Status:'), (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status);
                console.error(chalk_1.default.red('Data:'), JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data, null, 2));
            }
            else {
                console.error(chalk_1.default.red('Unexpected Error:'), error.message);
            }
            console.error(chalk_1.default.red('-------------------------------'));
        }
    });
}
/**
 * フレンドリストを取得します。
 */
function fetchFriends(token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${API_URL}/users/dms`, {
                headers: { 'x-session-token': token },
            });
            return response.data;
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to fetch friends.'));
            return [];
        }
    });
}
/**
 * フレンドリクエストを送信します。
 */
function addFriend(userId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            yield axios_1.default.post(`${API_URL}/users/${userId}/friend`, {}, {
                headers: { 'x-session-token': token },
            });
        }
        catch (error) {
            console.error(chalk_1.default.red('--- FAILED TO ADD FRIEND ---'));
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                console.error(chalk_1.default.red('Status:'), (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status);
                console.error(chalk_1.default.red('Data:'), JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data, null, 2));
            }
            else {
                console.error(chalk_1.default.red('Unexpected Error:'), error.message);
            }
            console.error(chalk_1.default.red('----------------------------'));
        }
    });
}
/**
 * フレンドを削除します。
 */
function removeFriend(userId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            yield axios_1.default.delete(`${API_URL}/users/${userId}/friend`, {
                headers: { 'x-session-token': token },
            });
        }
        catch (error) {
            console.error(chalk_1.default.red('--- FAILED TO REMOVE FRIEND ---'));
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                console.error(chalk_1.default.red('Status:'), (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status);
                console.error(chalk_1.default.red('Data:'), JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data, null, 2));
            }
            else {
                console.error(chalk_1.default.red('Unexpected Error:'), error.message);
            }
            console.error(chalk_1.default.red('-------------------------------'));
        }
    });
}
