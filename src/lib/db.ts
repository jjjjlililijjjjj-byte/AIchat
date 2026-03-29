import Dexie, { Table } from 'dexie';

export interface Character {
  id?: number;
  name: string;
  avatar: string;
  worldview: string;
  regexRules?: { match: string; replace: string }[];
  mandatorySuffix?: string;
  proactiveChance?: number;
  tags?: string[];
  openingMessage?: string;
  longMemory?: boolean;
  background?: string;
  isCustom?: boolean;
}

export interface UserSettings {
  id: string;
  userName: string;
  userNickname: string;
  userAvatar?: string;
  userSignature?: string;
  momentsBackground?: string;
  globalBackground?: string;
}

export interface ChatMessage {
  id?: number;
  characterId?: number; // For 1-on-1 chats, or the AI sender in a group chat
  groupId?: number; // For group chats
  text: string;
  image?: string;
  sender: 'user' | 'ai';
  timestamp: number;
  read?: boolean;
  isRecalled?: boolean;
  quote?: {
    text: string;
    sender: 'user' | 'ai';
    senderName?: string;
  };
  music?: {
    title: string;
    url: string;
  };
}

export interface Group {
  id?: number;
  name: string;
  avatar: string;
  characterIds: number[];
  createdAt: number;
}

export interface Moment {
  id?: number;
  userId?: string; // 'me' or undefined
  characterId?: number; // if AI post
  content: string;
  image?: string;
  timestamp: number;
  likes: number;
  likedByMe?: boolean;
  likedByNames?: string[];
  replies: { characterId?: number; userId?: string; text: string; timestamp: number }[];
}

export class SmallPhoneDatabase extends Dexie {
  characters!: Table<Character>;
  messages!: Table<ChatMessage>;
  moments!: Table<Moment>;
  settings!: Table<UserSettings>;
  groups!: Table<Group>;

  constructor() {
    super('SmallPhoneDB');
    this.version(4).stores({
      characters: '++id, name, isCustom',
      messages: '++id, characterId, groupId, timestamp',
      moments: '++id, timestamp',
      settings: 'id',
      groups: '++id, name'
    });
  }
}

export const db = new SmallPhoneDatabase();
