export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  isRead: boolean;
}

export interface Chat {
  id: string;
  title: string;
  description?: string;
  participants: string[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  unreadCount: number;
}

export interface ChatData {
  users: User[];
  chats: Chat[];
}