import { useParams } from "react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export function TrackPage() {
  const { ticketCode } = useParams();
  return (
    <div className="min-h-svh bg-slate-50 px-4 py-10">
      <PagePlaceholder
        title={`Track ${ticketCode ?? "ticket"}`}
        description="Public status stepper for this ticket. Full timeline lands in step 3."
      />
    </div>
  );
}
