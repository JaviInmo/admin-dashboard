import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteNoteProps {
  noteId: string;
  noteTitle: string;
  noteDescription?: string;
  onConfirmDelete?: (noteId: string) => void;
  onCancel?: () => void;
}

export const DeleteNote: React.FC<DeleteNoteProps> = ({
  noteId,
  noteTitle,
  noteDescription,
  onConfirmDelete,
  onCancel
}) => {
  const handleConfirmDelete = () => {
    onConfirmDelete?.(noteId);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-destructive/20">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Eliminar Nota</CardTitle>
        </div>
        <CardDescription>
          Esta acción no se puede deshacer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-1">{noteTitle}</h4>
          {noteDescription && (
            <p className="text-xs text-muted-foreground">{noteDescription}</p>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>¿Estás seguro de que quieres eliminar esta nota?</p>
          <p className="mt-1 font-medium">
            Se eliminarán todos los mensajes y contenido asociado.
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Nota
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};