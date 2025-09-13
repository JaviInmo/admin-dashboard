"use client";


import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Service } from "../types";
import { useI18n } from "@/i18n";

interface ShowServiceDialogProps {
  service: Service;
  open: boolean;
  onClose: () => void;
  compact?: boolean;
}

export default function ShowServiceDialog({ service, open, onClose, compact = false }: ShowServiceDialogProps) {
  const { TEXT } = useI18n();

  const dialogClass = compact ? "max-w-2xl w-full" : "max-w-4xl w-full";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle>{TEXT?.services?.show?.title ?? "Service details"}</DialogTitle>
        </DialogHeader>

        <div className="p-4 text-sm">
          <div className="space-y-2">
            <div><strong>{TEXT?.services?.fields?.name ?? "Name"}:</strong> {service.name}</div>
            <div><strong>{TEXT?.services?.fields?.description ?? "Description"}:</strong> {service.description ?? "-"}</div>
            <div><strong>{TEXT?.services?.fields?.guard ?? "Guard"}:</strong> {service.guardName ?? "-"}</div>
            <div><strong>{TEXT?.services?.fields?.assignedProperty ?? "Property"}:</strong> {service.propertyName ?? "-"}</div>
            <div><strong>{TEXT?.services?.fields?.rate ?? "Rate"}:</strong> {service.rate ?? "-"}</div>
            <div><strong>{TEXT?.services?.fields?.monthlyBudget ?? "Monthly budget"}:</strong> {service.monthlyBudget ?? "-"}</div>
            <div><strong>{TEXT?.services?.fields?.contractStartDate ?? "Contract start"}:</strong> {service.contractStartDate ?? "-"}</div>
            <div><strong>{TEXT?.services?.fields?.startTime ?? "Start time"}:</strong> {service.startTime ?? "-"}</div>
            <div><strong>{TEXT?.services?.fields?.endTime ?? "End time"}:</strong> {service.endTime ?? "-"}</div>
            <div><strong>{TEXT?.services?.fields?.recurrent ?? "Recurrent"}:</strong> {service.recurrent ? (TEXT?.common?.yes ?? "Yes") : (TEXT?.common?.no ?? "No")}</div>
            <div><strong>{TEXT?.services?.fields?.schedule ?? "Schedule"}:</strong> {Array.isArray(service.schedule) && service.schedule.length > 0 ? service.schedule.join(", ") : "-"}</div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>{TEXT?.actions?.close ?? "Close"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
