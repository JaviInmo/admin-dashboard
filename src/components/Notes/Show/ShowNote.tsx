import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { Eye, Edit2, Trash2, Calendar, MessageSquare, User } from 'lucide-react';

interface ShowNoteProps {
  noteId: string;
  title: string;
  description?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  participants: string[];
  onEdit?: (noteId: string) => void;
  onDelete?: (noteId: string) => void;
  onClose?: () => void;
}

export const ShowNote: React.FC<ShowNoteProps> = ({
  noteId,
  title,
  description,
  content,
  createdAt,
  updatedAt,
  messageCount,
  participants,
  onEdit,
  onDelete,
  onClose
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(noteId)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(noteId)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información de la nota */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <div>
              <p className="font-medium">Creado</p>
              <p>{formatDate(createdAt)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <div>
              <p className="font-medium">Mensajes</p>
              <p>{messageCount} mensaje{messageCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <div>
              <p className="font-medium">Participantes</p>
              <p>{participants.length} usuario{participants.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Badges de estado */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            ID: {noteId}
          </Badge>
          {updatedAt.getTime() !== createdAt.getTime() && (
            <Badge variant="outline">
              Actualizado: {formatDate(updatedAt)}
            </Badge>
          )}
        </div>

        {/* Contenido de la nota */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Contenido</h4>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          </ScrollArea>
        </div>

        {/* Botón de cerrar */}
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};