import { cn } from "@/lib/utils";

interface TableLoadingCellProps {
  className?: string;
  width?: "short" | "medium" | "long" | "full";
}

export function TableLoadingCell({ className, width = "medium" }: TableLoadingCellProps) {
  const widthClasses = {
    short: "w-3/5 min-w-12 max-w-16",
    medium: "w-4/5 min-w-16 max-w-24", 
    long: "w-5/6 min-w-20 max-w-32",
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
