"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Service } from "../types";
import { useI18n } from "@/i18n";

interface ShowServiceDialogProps {
  service: Service;
  open: boolean;
  onClose: () => void;
  compact?: boolean;
}

export default function ShowServiceDialog({
  service,
  open,
  onClose,
  compact = false,
}: ShowServiceDialogProps) {
  const { TEXT } = useI18n();

  const dialogClass = compact ? "max-w-2xl w-full" : "max-w-4xl w-full";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className="pl-3">
            {TEXT?.services?.show?.title ?? "Service details"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 text-sm">
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2">
              <div className="">
                <div className="flex flex-col pb-2">
                  <strong>{TEXT?.services?.fields?.name ?? "Name"}:</strong>
                  <span>{service.name}</span>
                </div>
                <div className="flex flex-col pb-2">
                  <strong>
                    {TEXT?.services?.fields?.assignedProperty ?? "Property"}:
                  </strong>
                  <span>{service.propertyName ?? "-"}</span>
                </div>
                <div className="flex flex-col pb-2">
                  <strong>
                    {TEXT?.services?.fields?.recurrent ?? "Recurrent"}:
                  </strong>
                  <span>
                    {service.recurrent
                      ? TEXT?.common?.yes ?? "Yes"
                      : TEXT?.common?.no ?? "No"}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex flex-col pb-2">
                  <strong>{TEXT?.services?.fields?.guard ?? "Guard"}:</strong>
                  <span>{service.guardName ?? "-"}</span>
                </div>
                <div className="flex flex-col pb-2">
                  <strong>{TEXT?.services?.fields?.rate ?? "Rate"}:</strong>
                  <span>{service.rate ?? "-"}</span>
                </div>
                <div className="flex flex-col pb-2">
                  <strong>
                    {TEXT?.services?.fields?.monthlyBudget ?? "Monthly budget"}:
                  </strong>
                  <span> {service.monthlyBudget ?? "-"}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2  ">
              <div className="flex flex-col pb-2">
                <strong>
                  {TEXT?.services?.fields?.startTime ?? "Start time"}:
                </strong>
                <span>{service.startTime ?? "-"}</span>
              </div>
              <div className="flex flex-col pb-2">
                <strong>
                  {TEXT?.services?.fields?.endTime ?? "End time"}:
                </strong>
                <span> {service.endTime ?? "-"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 ">
              <div className="flex flex-col pb-2">
                <strong>
                  {TEXT?.services?.fields?.contractStartDate ??
                    "Contract start"}
                  :
                </strong>
                <span> {service.contractStartDate ?? "-"}</span>
              </div>
              <div className="flex flex-col pb-2">
                <strong>
                  {TEXT?.services?.fields?.description ?? "Description"}:
                </strong>{" "}
                {service.description ?? "-"}
              </div>
            </div>

            
        </div>
           </div>

        <DialogFooter>
          <div className="flex justify-end ">
            <Button variant="outline" onClick={onClose}>
              {TEXT?.actions?.close ?? "Close"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
