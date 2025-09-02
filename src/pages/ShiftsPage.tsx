import { useI18n } from "@/i18n";
import { ShiftsProvider } from "@/contexts/shifts-context";
import AsidePanelGeneral from "@/components/Shifts/AsidePanelGeneral";
import KPISummaryInline from "@/components/Shifts/KPISummaryInline";

export default function ShiftsPage() {
  const { TEXT } = useI18n();
  return (
    <ShiftsProvider>
      <div className="p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{TEXT.menu.shifts}</h1>
          <div className="ml-auto"><KPISummaryInline /></div>
        </div>
        <div className="flex flex-col gap-4">
          <AsidePanelGeneral />
        </div>
      </div>
    </ShiftsProvider>
  );
}
