import React from 'react';
import type { User } from '../Notes/type';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface UserListProps {
  users: User[];
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
  getUserChatCount: (userId: string) => number;
  getUserUnreadCount: (userId: string) => number;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  selectedUserId,
  onUserSelect,
  getUserChatCount,
  getUserUnreadCount,
}) => {
  return (
    <div className="w-80 border-r bg-muted/10">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Usuarios</h2>
        <p className="text-sm text-muted-foreground">
          {users.length} usuarios disponibles
        </p>
      </div>
      
      <ScrollArea className="h-[600px]">
        <div className="p-2">
          {users.map((user) => {
            const chatCount = getUserChatCount(user.id);
            const unreadCount = getUserUnreadCount(user.id);
            
            return (
              <div
                key={user.id}
                onClick={() => onUserSelect(user.id)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2
                  hover:bg-accent hover:shadow-sm
                  ${selectedUserId === user.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'bg-background hover:bg-muted/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Indicador de estado online */}
                      <div className={`
                        absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white
                        ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}
                      `} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.isOnline ? 'En línea' : user.lastSeen}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1">
                    {chatCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {chatCount} chat{chatCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    
                    {unreadCount > 0 && (
                      <Badge className="bg-red-500 hover:bg-red-600 text-xs min-w-[20px] h-5 p-0 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};