import React, { useState } from 'react';
import { Card } from '../ui/card';
import { UserList } from './UserList';
import { ChatList } from './ChatList';
import { ChatView } from './ChatView';
import { mockData } from '../../components/Notes/MockData';


export const NotesContainer: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const selectedUser = selectedUserId 
    ? mockData.users.find(u => u.id === selectedUserId) || null 
    : null;

  const selectedChat = selectedChatId 
    ? mockData.chats.find(c => c.id === selectedChatId) || null 
    : null;

  const getUserChatCount = (userId: string) => {
    return mockData.chats.filter(chat => chat.participants.includes(userId)).length;
  };

  const getUserUnreadCount = (userId: string) => {
    return mockData.chats
      .filter(chat => chat.participants.includes(userId))
      .reduce((total, chat) => total + chat.unreadCount, 0);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedChatId(null); // Reset chat selection when user changes
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleSendMessage = (chatId: string, content: string) => {
    // En una aplicación real, aquí enviarías el mensaje al backend
    console.log(`Enviando mensaje al chat ${chatId}: ${content}`);
    
    // Simulamos agregar el mensaje localmente
    const chatIndex = mockData.chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      const newMessage = {
        id: Date.now().toString(),
        content,
        senderId: 'current',
        timestamp: new Date(),
        isRead: false,
      };
      
      mockData.chats[chatIndex].messages.push(newMessage);
      mockData.chats[chatIndex].updatedAt = new Date();
    }
  };

  const handleEditMessage = (chatId: string, messageId: string, newContent: string) => {
    console.log(`Editando mensaje ${messageId} en chat ${chatId}: ${newContent}`);
    
    const chatIndex = mockData.chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      const messageIndex = mockData.chats[chatIndex].messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        mockData.chats[chatIndex].messages[messageIndex].content = newContent;
        mockData.chats[chatIndex].updatedAt = new Date();
      }
    }
  };

  const handleDeleteMessage = (chatId: string, messageId: string) => {
    console.log(`Eliminando mensaje ${messageId} del chat ${chatId}`);
    
    const chatIndex = mockData.chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      mockData.chats[chatIndex].messages = mockData.chats[chatIndex].messages.filter(
        m => m.id !== messageId
      );
      mockData.chats[chatIndex].updatedAt = new Date();
    }
  };

  return (
    <div className="space-y-6">
     

      <Card className="h-[700px] shadow-xl border-2 bg-white/80 backdrop-blur-sm">
        <div className="flex h-full">
          <UserList
            users={mockData.users}
            selectedUserId={selectedUserId}
            onUserSelect={handleUserSelect}
            getUserChatCount={getUserChatCount}
            getUserUnreadCount={getUserUnreadCount}
          />
          
          <ChatList
            chats={mockData.chats}
            selectedUser={selectedUser}
            selectedChatId={selectedChatId}
            onChatSelect={handleChatSelect}
          />
          
          <ChatView
            selectedChat={selectedChat}
            selectedUser={selectedUser}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        </div>
      </Card>
    </div>
  );
};