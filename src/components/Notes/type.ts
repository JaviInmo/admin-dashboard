// src/components/Notes/type.ts
export type Note = {
  id: number;
  name: string;
  description?: string | null;
  
  amount: number | null;

  amount_raw?: string | null;
  client?: number | null; // id del cliente
  property_obj?: number | null; // id de la propiedad relacionada
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateNotePayload = {
 
  name: string;
  description?: string | null;
 
  amount?: string | number | null;
  client?: number | null;
  property_obj?: number | null;
};

export type UpdateNotePayload = Partial<CreateNotePayload>;

export type DuplicateNotePayload = {
  name?: string;
};
