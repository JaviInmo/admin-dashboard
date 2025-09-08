import React, { useState } from 'react';
import type { Chat, Message, User } from '../../components/Notes/type';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { Send, MessageSquare, Clock, Edit2, Trash2, Check, X } from 'lucide-react';

interface ChatViewProps {
  selectedChat: Chat | null;
  selectedUser: User | null;
  onSendMessage: (chatId: string, content: string) => void;
  onEditMessage: (chatId: string, messageId: string, newContent: string) => void;
  onDeleteMessage: (chatId: string, messageId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  selectedChat,
  selectedUser,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <div className="text-center p-8">
          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium text-muted-foreground mb-2">
            Selecciona una conversación
          </h3>
          <p className="text-sm text-muted-foreground">
            Elige un chat de la lista para comenzar a conversar
          </p>
        </div>
      </div>
    );
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(selectedChat.id, newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editingContent.trim()) {
      onEditMessage(selectedChat.id, editingMessageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
      onDeleteMessage(selectedChat.id, messageId);
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageDate = (timestamp: Date) => {
    const today = new Date();
    const messageDate = new Date(timestamp);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Hoy';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    
    return messageDate.toLocaleDateString('es-ES');
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [date: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = formatMessageDate(message.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(selectedChat.messages);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header del Chat */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {selectedUser && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  {selectedUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h3 className="font-semibold">{selectedChat.title}</h3>
              {selectedChat.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedChat.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {selectedChat.messages.length} mensaje{selectedChat.messages.length !== 1 ? 's' : ''}
            </p>
            {selectedUser && (
              <div className="flex items-center justify-end space-x-1 text-xs text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span>{selectedUser.isOnline ? 'En línea' : selectedUser.lastSeen}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Área de Mensajes */}
      <ScrollArea className="flex-1 p-4">
        {selectedChat.messages.length === 0 ? (
          <div className="text-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium text-muted-foreground mb-2">
              Inicia la conversación
            </h4>
            <p className="text-sm text-muted-foreground">
              Envía el primer mensaje para comenzar esta conversación
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(messageGroups).map(([date, messages]) => (
              <div key={date}>
                {/* Separador de fecha */}
                <div className="flex items-center justify-center py-2">
                  <div className="bg-muted px-3 py-1 rounded-full">
                    <span className="text-xs font-medium text-muted-foreground">
                      {date}
                    </span>
                  </div>
                </div>
                
                {/* Mensajes del día */}
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex group ${message.senderId === 'current' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[70%] ${message.senderId === 'current' ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                        {message.senderId !== 'current' && selectedUser && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                              {selectedUser.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="relative">
                          <div className={`
                            px-4 py-2 rounded-2xl shadow-sm
                            ${message.senderId === 'current' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                            }
                          `}>
                            {editingMessageId === message.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="min-h-[60px] text-sm resize-none"
                                  autoFocus
                                />
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleSaveEdit}
                                    className="h-6 px-2"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    className="h-6 px-2"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm leading-relaxed">{message.content}</p>
                                <div className={`
                                  flex items-center mt-1 space-x-1 text-xs
                                  ${message.senderId === 'current' 
                                    ? 'text-primary-foreground/70' 
                                    : 'text-muted-foreground'
                                  }
                                `}>
                                  <Clock className="h-3 w-3" />
                                  <span>{formatMessageTime(message.timestamp)}</span>
                                  {!message.isRead && message.senderId === 'current' && (
                                    <span className="font-medium">✓</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Botones de acción (solo para mensajes propios) */}
                          {message.senderId === 'current' && editingMessageId !== message.id && (
                            <div className={`
                              absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity
                              ${message.senderId === 'current' ? '-left-16' : '-right-16'}
                              flex space-x-1
                            `}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditMessage(message.id, message.content)}
                                className="h-6 w-6 p-0 hover:bg-muted"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteMessage(message.id)}
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input para nuevo mensaje */}
      <div className="p-4 border-t bg-background">
        <div className="flex space-x-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};