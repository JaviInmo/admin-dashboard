import { useI18n } from "@/i18n";
import { ShiftsProvider } from "@/contexts/shifts-context";
import AsidePanelGeneral from "@/components/Shifts/AsidePanelGeneral";
import KPISummaryInline from "@/components/Shifts/KPISummaryInline";

export default function ShiftsPage() {
  const { TEXT } = useI18n();
  return (
    <ShiftsProvider>
      <div className="h-[calc(100vh-80px)] flex flex-col p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3 flex-shrink-0">
          <h1 className="text-2xl font-semibold">{TEXT.menu.shifts}</h1>
          <div className="ml-auto"><KPISummaryInline /></div>
        </div>
        <div className="flex-1 min-h-0">
          <AsidePanelGeneral />
        </div>
      </div>
    </ShiftsProvider>
  );
}
