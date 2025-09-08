import React from 'react';
import type { Chat, User } from '../Notes/type';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { MessageSquare, Calendar } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  selectedUser: User | null;
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedUser,
  selectedChatId,
  onChatSelect,
}) => {
  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <div className="text-center p-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Selecciona un usuario
          </h3>
          <p className="text-sm text-muted-foreground">
            Elige un usuario de la lista para ver sus conversaciones
          </p>
        </div>
      </div>
    );
  }

  const userChats = chats.filter(chat => 
    chat.participants.includes(selectedUser.id)
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  return (
    <div className="flex-1 border-r">
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Chats con {selectedUser.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {userChats.length} conversacion{userChats.length !== 1 ? 'es' : ''}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`
              w-2 h-2 rounded-full
              ${selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-400'}
            `} />
            <span className="text-xs text-muted-foreground">
              {selectedUser.isOnline ? 'En línea' : selectedUser.lastSeen}
            </span>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[556px]">
        <div className="p-2">
          {userChats.length === 0 ? (
            <div className="text-center p-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay conversaciones con este usuario
              </p>
            </div>
          ) : (
            userChats.map((chat) => {
              const lastMessage = chat.messages[chat.messages.length - 1];
              
              return (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all duration-200 mb-2 border
                    hover:shadow-md hover:scale-[1.01]
                    ${selectedChatId === chat.id 
                      ? 'bg-primary/10 border-primary/30 shadow-sm' 
                      : 'bg-background hover:bg-muted/30 border-border'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{chat.title}</h4>
                      {chat.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {chat.description}
                        </p>
                      )}
                    </div>
                    
                    {chat.unreadCount > 0 && (
                      <Badge className="bg-red-500 hover:bg-red-600 text-xs min-w-[20px] h-5 p-0 flex items-center justify-center ml-2">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  {lastMessage ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {lastMessage.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(lastMessage.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {chat.messages.length} mensaje{chat.messages.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Sin mensajes aún
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};