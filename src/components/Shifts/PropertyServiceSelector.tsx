import { useQuery } from "@tanstack/react-query";
import { listServicesByProperty } from "@/lib/services/services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PropertyServiceSelectorProps {
  propertyId: number;
  selectedServiceId: number | "all" | undefined;
  onServiceChange: (serviceId: number | "all") => void;
}

// Hook separado para obtener servicios por propiedad
export function usePropertyServices(propertyId: number) {
  const { data: servicesData } = useQuery({
    queryKey: ["services", "property", propertyId],
    queryFn: async () => {
      const result = await listServicesByProperty(propertyId, 1, undefined, 100);
      return result.items ?? [];
    },
    staleTime: 60_000,
  });

  return servicesData ?? [];
}

export function PropertyServiceSelector({
  propertyId,
  selectedServiceId,
  onServiceChange,
}: PropertyServiceSelectorProps) {
  const services = usePropertyServices(propertyId);

  // Si no hay servicios, no mostrar el selector
  if (services.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedServiceId?.toString() ?? "all"}
      onValueChange={(value) => {
        onServiceChange(value === "all" ? "all" : Number(value));
      }}
    >
      <SelectTrigger className="h-6 text-xs w-full mt-1" onClick={(e) => e.stopPropagation()}>
        <SelectValue placeholder="Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los servicios</SelectItem>
        {services.map((service) => (
          <SelectItem key={service.id} value={service.id!.toString()}>
            {service.name || `Servicio ${service.id}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
