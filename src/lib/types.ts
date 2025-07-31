/**
 * Revolt User Object
 */
export interface User {
  _id: string;
  username: string;
  bot?: any; // bot or user
  online?: boolean;
  status?: {
    text?: string;
  };
}

/**
 * Revolt Server Object
 */
export interface Server {
  _id: string;
  name: string;
}

/**
 * Revolt Channel Object
 */
export interface Channel {
  _id: string;
  name: string;
  server: string;
  recipients?: string[];
}

/**
 * WebSocket Ready Event Payload
 */
export interface ReadyPayload {
  servers: Server[];
  channels: Channel[];
  users: User[];
}

/**
 * WebSocket Message Event Payload
 */
export interface MessagePayload {
  type: 'Message';
  _id: string; // Message ID
  channel: string;
  author: string; // Author ID
  content: string;
}
