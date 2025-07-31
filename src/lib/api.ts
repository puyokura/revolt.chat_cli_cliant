
import axios, { AxiosError } from 'axios';
import WebSocket from 'ws';
import FormData from 'form-data';
import fs from 'fs';
import chalk from 'chalk';
import { User } from './types';

const API_URL = 'https://api.revolt.chat';
const AUTUMN_URL = 'https://autumn.revolt.chat';

/**
 * Revolt APIにログインし、認証トークンを取得します。
 */
export async function login(email: string, password: string): Promise<string> {
  try {
    const response = await axios.post(`${API_URL}/auth/session/login`, { email, password });
    return response.data.token;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      throw new Error(`Login failed: ${axiosError.response?.data?.message || axiosError.message}`);
    }
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * WebSocketに接続し、認証します。
 */
export function connectWebSocket(token: string): WebSocket {
  const ws = new WebSocket('wss://ws.revolt.chat');

  ws.on('open', () => {
    console.log(chalk.blue('Connecting to Revolt...'));
    ws.send(JSON.stringify({ type: 'Authenticate', token }));
  });

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'Ping', data: 0 }));
    }
  }, 20000);

  ws.on('close', () => {
    console.log(chalk.yellow('Disconnected from Revolt.'));
    clearInterval(pingInterval);
    process.exit(0);
  });

  ws.on('error', (error) => {
    console.error(chalk.red('WebSocket error:', error.message));
    clearInterval(pingInterval);
    process.exit(1);
  });

  return ws;
}

/**
 * 自身のユーザー情報を取得します。
 */
export async function fetchSelf(token: string): Promise<User> {
    try {
        const response = await axios.get(`${API_URL}/users/@me`, {
            headers: { 'x-session-token': token },
        });
        return response.data;
    } catch (error) {
        console.error(chalk.red('Failed to fetch self user data.'));
        throw error;
    }
}

/**
 * 指定されたサーバーのメンバーリストを取得します。
 */
export async function fetchServerMembers(serverId: string, token: string): Promise<{ users: User[] }> {
    try {
        const response = await axios.get(`${API_URL}/servers/${serverId}/members`, {
            headers: { 'x-session-token': token },
        });
        return response.data;
    } catch (error) {
        console.error(chalk.red(`Failed to fetch members for server ${serverId}.`));
        return { users: [] };
    }
}


/**
 * 指定されたチャンネルの過去のメッセージを取得します。
 */
export async function fetchPastMessages(channelId: string, token: string, limit: number = 20): Promise<any[]> {
  try {
    const response = await axios.get(`${API_URL}/channels/${channelId}/messages`, {
      headers: { 'x-session-token': token },
      params: { limit },
    });
    return response.data.messages || [];
  } catch (error: any) {
    console.error(chalk.red('Failed to fetch past messages.'));
    return [];
  }
}

/**
 * チャンネルにメッセージを送信します。
 */
export async function sendMessage(channelId: string, token: string, content: string, attachments?: string[], replies?: { id: string, mention: boolean }[]): Promise<void> {
  try {
    const payload: { content: string; attachments?: string[]; replies?: { id: string, mention: boolean }[] } = { content };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }
    if (replies && replies.length > 0) {
      payload.replies = replies;
    }

    await axios.post(`${API_URL}/channels/${channelId}/messages`, 
      payload, 
      { headers: { 'x-session-token': token } }
    );
  } catch (error: any) {
    console.error(chalk.red('--- FAILED TO SEND MESSAGE ---'));
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      console.error(chalk.red('Status:'), axiosError.response?.status);
      console.error(chalk.red('Data:'), JSON.stringify(axiosError.response?.data, null, 2));
      console.error(chalk.red('Message:'), axiosError.message);
    } else {
      console.error(chalk.red('Unexpected Error:'), error.message);
    }
    console.error(chalk.red('------------------------------'));
  }
}

/**
 * チャンネルのメッセージを編集します。
 */
export async function editMessage(channelId: string, messageId: string, token: string, content: string): Promise<void> {
  try {
    await axios.patch(`${API_URL}/channels/${channelId}/messages/${messageId}`, 
      { content }, 
      { headers: { 'x-session-token': token } }
    );
  } catch (error: any) {
    console.error(chalk.red('--- FAILED TO EDIT MESSAGE ---'));
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      console.error(chalk.red('Status:'), axiosError.response?.status);
      console.error(chalk.red('Data:'), JSON.stringify(axiosError.response?.data, null, 2));
    } else {
      console.error(chalk.red('Unexpected Error:'), error.message);
    }
    console.error(chalk.red('----------------------------'));
  }
}

/**
 * チャンネルのメッセージを削除します。
 */
export async function deleteMessage(channelId: string, messageId: string, token: string): Promise<void> {
  try {
    await axios.delete(`${API_URL}/channels/${channelId}/messages/${messageId}`, {
      headers: { 'x-session-token': token },
    });
  } catch (error: any) {
    console.error(chalk.red('--- FAILED TO DELETE MESSAGE ---'));
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      console.error(chalk.red('Status:'), axiosError.response?.status);
      console.error(chalk.red('Data:'), JSON.stringify(axiosError.response?.data, null, 2));
    } else {
      console.error(chalk.red('Unexpected Error:'), error.message);
    }
    console.error(chalk.red('------------------------------'));
  }
}

/**
 * ファイルをAutumnにアップロードし、添付ファイルIDを取得します。
 */
export async function uploadFile(filePath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red('File not found at the specified path.'));
      return null;
    }
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(`${AUTUMN_URL}/attachments`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    return uploadResponse.data.id;
  } catch (error: any) {
    console.error(chalk.red('File upload failed:', error.message));
    return null;
  }
}

/**
 * ユーザープロフィールを取得します。
 */
export async function fetchUserProfile(userId: string, token: string): Promise<any | null> {
  try {
    const response = await axios.get(`${API_URL}/users/${userId}`, {
      headers: { 'x-session-token': token },
    });
    return response.data;
  } catch (error) {
    console.error(chalk.red('Failed to fetch user profile.'));
    return null;
  }
}

/**
 * 自身のステータスを更新します。
 */
export async function updateUserStatus(token: string, status: { text?: string, presence?: 'Online' | 'Idle' | 'Busy' | 'Invisible' }): Promise<void> {
  try {
    await axios.patch(`${API_URL}/users/@me`, 
      { status }, 
      { headers: { 'x-session-token': token } }
    );
  } catch (error: any) {
    console.error(chalk.red('--- FAILED TO UPDATE STATUS ---'));
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      console.error(chalk.red('Status:'), axiosError.response?.status);
      console.error(chalk.red('Data:'), JSON.stringify(axiosError.response?.data, null, 2));
    } else {
      console.error(chalk.red('Unexpected Error:'), error.message);
    }
    console.error(chalk.red('-------------------------------'));
  }
}

/**
 * フレンドリストを取得します。
 */
export async function fetchFriends(token: string): Promise<any[]> {
  try {
    const response = await axios.get(`${API_URL}/users/dms`, {
      headers: { 'x-session-token': token },
    });
    return response.data;
  } catch (error) {
    console.error(chalk.red('Failed to fetch friends.'));
    return [];
  }
}

/**
 * フレンドリクエストを送信します。
 */
export async function addFriend(userId: string, token: string): Promise<void> {
  try {
    await axios.post(`${API_URL}/users/${userId}/friend`, {}, {
      headers: { 'x-session-token': token },
    });
  } catch (error: any) {
    console.error(chalk.red('--- FAILED TO ADD FRIEND ---'));
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      console.error(chalk.red('Status:'), axiosError.response?.status);
      console.error(chalk.red('Data:'), JSON.stringify(axiosError.response?.data, null, 2));
    } else {
      console.error(chalk.red('Unexpected Error:'), error.message);
    }
    console.error(chalk.red('----------------------------'));
  }
}

/**
 * フレンドを削除します。
 */
export async function removeFriend(userId: string, token: string): Promise<void> {
  try {
    await axios.delete(`${API_URL}/users/${userId}/friend`, {
      headers: { 'x-session-token': token },
    });
  } catch (error: any) {
    console.error(chalk.red('--- FAILED TO REMOVE FRIEND ---'));
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      console.error(chalk.red('Status:'), axiosError.response?.status);
      console.error(chalk.red('Data:'), JSON.stringify(axiosError.response?.data, null, 2));
    } else {
      console.error(chalk.red('Unexpected Error:'), error.message);
    }
    console.error(chalk.red('-------------------------------'));
  }
}
