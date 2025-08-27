import { cn } from "@/lib/utils";

interface TableLoadingCellProps {
  className?: string;
  width?: "short" | "medium" | "long" | "full";
}

export function TableLoadingCell({ className, width = "medium" }: TableLoadingCellProps) {
  const widthClasses = {
    short: "w-16",
    medium: "w-24", 
    long: "w-32",
    full: "w-full"
  };

  return (
    <div
      className={cn(
        "h-4 bg-muted rounded animate-pulse",
        widthClasses[width],
        className
      )}
    />
  );
}
