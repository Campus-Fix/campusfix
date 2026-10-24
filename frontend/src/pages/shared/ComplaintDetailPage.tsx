import { useParams } from "react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export function ComplaintDetailPage() {
  const { id } = useParams();
  return (
    <PagePlaceholder
      title={`Complaint #${id ?? ""}`}
      description="Detail, timeline, AI card and permission-based actions."
    />
  );
}
