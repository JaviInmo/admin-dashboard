"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface PageSizeSelectorProps {
  pageSize: number;
  onChange?: (size: number) => void;
  options?: number[];
  ariaLabel?: string;
  className?: string;
}

export default function PageSizeSelector({
  pageSize,
  onChange,
  options = [5, 10, 20, 50, 100],
  ariaLabel = "Items por página",
  className,
}: PageSizeSelectorProps) {
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-32 justify-between">
            {pageSize} {ariaLabel}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {options.map((size) => (
            <DropdownMenuItem
              key={size}
              onClick={() => onChange?.(size)}
              className={pageSize === size ? "bg-accent" : ""}
            >
              {size} {ariaLabel}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
