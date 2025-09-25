// src/components/Notes/type.ts
export type Note = {
  id: number;
  name: string;
  description?: string | null;

  amount: number | null;
  amount_raw?: string | null;

  client?: number | null; // id del cliente
  property_obj?: number | null; // id de la propiedad relacionada

  // Relaciones adicionales (solo ids)
  guard?: number | null;
  service?: number | null;
  shift?: number | null;
  expense?: number | null;
  weapon?: number | null;
  guard_property_tariff?: number | null;
  property_type_of_service?: number | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateNotePayload = {
  name: string;
  description?: string | null;

  amount?: string | number | null;

  // ids (opcional)
  client?: number | null;
  property_obj?: number | null;
  guard?: number | null;
  service?: number | null;
  shift?: number | null;
  expense?: number | null;
  weapon?: number | null;
  guard_property_tariff?: number | null;
  property_type_of_service?: number | null;
};

export type UpdateNotePayload = Partial<CreateNotePayload>;

export type DuplicateNotePayload = {
  name?: string;
};
