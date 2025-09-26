// src/components/Notes/type.ts
export type Note = {
  id: number;
  name: string;
  description?: string | null;

  amount: number | null;
  amount_raw?: string | null;

  // ahora relaciones como arrays de ids
  clients?: number[]; // ids de clientes
  properties?: number[]; // ids de propiedades
  guards?: number[];
  services?: number[];
  shifts?: number[];
  weapons?: number[];
  type_of_services?: number[]; // property_type_of_service renamed semánticamente
  viewed_by_ids?: number[];

  // kept some older single fields as optional for compatibilidad si hace falta
  client?: number | null;
  property_obj?: number | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateNotePayload = {
  name: string;
  description?: string | null;

  amount?: string | number | null;

  // ahora arrays de ids (opcional)
  clients?: number[] | null;
  properties?: number[] | null;
  guards?: number[] | null;
  services?: number[] | null;
  shifts?: number[] | null;
  weapons?: number[] | null;
  type_of_services?: number[] | null;

  // campos legacy (opcional)
  client?: number | null;
  property_obj?: number | null;
};

export type UpdateNotePayload = Partial<CreateNotePayload>;

export type DuplicateNotePayload = {
  name?: string;
};
