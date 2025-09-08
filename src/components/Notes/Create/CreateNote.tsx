import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Plus, Save, X } from 'lucide-react';

interface CreateNoteProps {
  onCreateNote?: (title: string, description: string, content: string) => void;
  onCancel?: () => void;
}

export const CreateNote: React.FC<CreateNoteProps> = ({ onCreateNote, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      onCreateNote?.(title.trim(), description.trim(), content.trim());
      // Reset form
      setTitle('');
      setDescription('');
      setContent('');
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setContent('');
    onCancel?.();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Plus className="h-5 w-5 text-primary" />
          <CardTitle>Crear Nueva Nota</CardTitle>
        </div>
        <CardDescription>
          Crea una nueva nota o conversación temática
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Proyecto React, Diseño UI/UX, Marketing Digital..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de la temática (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Contenido inicial *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe el contenido inicial de la nota..."
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
              disabled={!title.trim() || !content.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              Crear Nota
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};