import { useParams } from "react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export function EditComplaintPage() {
  const { id } = useParams();
  return (
    <PagePlaceholder
      title={`Edit complaint #${id ?? ""}`}
      description="Owner can edit while the ticket is still submitted."
    />
  );
}
