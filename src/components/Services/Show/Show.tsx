"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Service } from "../types";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n";

import type { Guard } from "@/components/Guards/types";
import { getGuard } from "@/lib/services/guard";
import type { AppProperty } from "@/lib/services/properties";
import { getProperty } from "@/lib/services/properties";

interface ShowServiceDialogProps {
  service: Service;
  open: boolean;
  onClose: () => void;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  // fecha corta (sin hora)
  return d.toLocaleDateString();
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString();
}

export default function ShowServiceDialog({ service, open, onClose }: ShowServiceDialogProps) {
  const { TEXT } = useI18n();

  // fetch guard name if not provided
  const guardQuery = useQuery<Guard, Error>({
    queryKey: ["guard-detail-show", service.guard],
    queryFn: async () => {
      if (!service.guard) throw new Error("no guard id");
      return await getGuard(service.guard);
    },
    enabled: !!service.guard && !service.guardName,
  });

  const propQuery = useQuery<AppProperty, Error>({
    queryKey: ["property-detail-show", service.assignedProperty],
    queryFn: async () => {
      if (!service.assignedProperty) throw new Error("no property id");
      return await getProperty(service.assignedProperty);
    },
    enabled: !!service.assignedProperty && !service.propertyName,
  });

  const guardLabel = React.useMemo(() => {
    if (service.guardName) return service.guardName;
    if (guardQuery.data) return `${guardQuery.data.firstName} ${guardQuery.data.lastName}${guardQuery.data.email ? ` — ${guardQuery.data.email}` : ""}`;
    if (service.guard) return `#${service.guard}`;
    return "-";
  }, [service.guardName, guardQuery.data, service.guard]);

  const propertyLabel = React.useMemo(() => {
    if (service.propertyName) return service.propertyName;
    if (propQuery.data) return `${propQuery.data.name ?? propQuery.data.alias ?? "Property #" + propQuery.data.id} — ${propQuery.data.address ?? "-"}`;
    if (service.assignedProperty) return `#${service.assignedProperty}`;
    return "-";
  }, [service.propertyName, propQuery.data, service.assignedProperty]);

  const isActiveLabel = React.useMemo(() => {
    if (service.isActive === null || service.isActive === undefined) return "-";
    return service.isActive ? (TEXT?.common?.yes ?? "Yes") : (TEXT?.common?.no ?? "No");
  }, [service.isActive, TEXT]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TEXT?.services?.show?.title ?? "Service details"}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-2 text-sm">
          <div><strong>{TEXT?.services?.fields?.name ?? "Name"}:</strong> {service.name}</div>
          <div><strong>{TEXT?.services?.fields?.description ?? "Description"}:</strong> {service.description ?? "-"}</div>
          <div><strong>{TEXT?.services?.fields?.guard ?? "Guard"}:</strong> {guardLabel}</div>
          <div><strong>{TEXT?.services?.fields?.assignedProperty ?? "Property"}:</strong> {propertyLabel}</div>
          <div><strong>{TEXT?.services?.fields?.rate ?? "Rate"}:</strong> {service.rate ?? "-"}</div>
          <div><strong>{TEXT?.services?.fields?.monthlyBudget ?? "Monthly Budget"}:</strong> {service.monthlyBudget ?? "-"}</div>
          <div><strong>{TEXT?.services?.fields?.totalHours ?? "Total Hours"}:</strong> {service.totalHours ?? "-"}</div>
          <div><strong>{TEXT?.services?.fields?.contractStartDate ?? "Contract start date"}:</strong> {formatDate(service.contractStartDate)}</div>
          <div><strong>{TEXT?.services?.fields?.isActive ?? "Is active"}:</strong> {isActiveLabel}</div>
          <div><strong>{TEXT?.services?.fields?.createdAt ?? "Created at"}:</strong> {formatDateTime(service.createdAt)}</div>
          <div><strong>{TEXT?.services?.fields?.updatedAt ?? "Updated at"}:</strong> {formatDateTime(service.updatedAt)}</div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{TEXT?.actions?.close ?? "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
