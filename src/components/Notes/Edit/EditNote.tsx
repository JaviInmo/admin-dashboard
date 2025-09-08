import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Edit2, Save, X } from 'lucide-react';

interface EditNoteProps {
  noteId: string;
  initialTitle: string;
  initialDescription: string;
  initialContent: string;
  onSaveNote?: (noteId: string, title: string, description: string, content: string) => void;
  onCancel?: () => void;
}

export const EditNote: React.FC<EditNoteProps> = ({
  noteId,
  initialTitle,
  initialDescription,
  initialContent,
  onSaveNote,
  onCancel
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription);
    setContent(initialContent);
  }, [initialTitle, initialDescription, initialContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      onSaveNote?.(noteId, title.trim(), description.trim(), content.trim());
    }
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    setDescription(initialDescription);
    setContent(initialContent);
    onCancel?.();
  };

  const hasChanges = 
    title !== initialTitle || 
    description !== initialDescription || 
    content !== initialContent;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Edit2 className="h-5 w-5 text-primary" />
          <CardTitle>Editar Nota</CardTitle>
        </div>
        <CardDescription>
          Modifica el contenido de tu nota o conversación
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la nota"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la nota (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-content">Contenido *</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenido de la nota..."
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? 'Hay cambios sin guardar' : 'Sin cambios'}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || !content.trim() || !hasChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};