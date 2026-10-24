import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { confidencePct } from "@/lib/format";
import {
  useAiAccuracy,
  useAnalyticsByCategory,
  useAnalyticsByDepartment,
  useAnalyticsSummary,
  useAnalyticsTrend,
  useComplaints,
} from "@/hooks/queries";
import { AiInsightsPanel } from "@/components/dashboard/AiInsightsPanel";
import { ComplaintCard } from "@/components/complaints/ComplaintCard";
import { QueryError } from "@/components/complaints/QueryError";
import { Skeleton } from "@/components/ui/skeleton";

const PIE_COLORS = ["#4f46e5", "#7c3aed", "#0ea5e9", "#f59e0b", "#ef4444", "#10b981", "#64748b"];

function SectionHeader({
  title,
  to,
  toLabel,
  tone = "default",
}: {
  title: string;
  to: string;
  toLabel: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className={`text-sm font-semibold ${tone === "danger" ? "text-red-800" : "text-slate-900"}`}>{title}</p>
      <Link
        to={to}
        aria-label={toLabel}
        className={`inline-flex size-9 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
          tone === "danger"
            ? "bg-gradient-to-br from-rose-500 to-red-600 text-white hover:from-rose-400 hover:to-red-500"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500"
        }`}
      >
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
        warn ? "border-red-200 from-white to-rose-50" : "border-slate-200/80 from-white to-indigo-50/60"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${warn ? "text-red-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const summary = useAnalyticsSummary();
  const byCategory = useAnalyticsByCategory();
  const byDepartment = useAnalyticsByDepartment(isAdmin);
  const trend = useAnalyticsTrend();
  const accuracy = useAiAccuracy(isAdmin);
  const recent = useComplaints({ sort: "newest", limit: "5" });
  const overdue = useComplaints({ overdue: "true", sort: "due", limit: "5" });

  if (summary.isLoading) {
    return <Skeleton className="h-96" />;
  }
  if (summary.isError || !summary.data) {
    return <QueryError error={summary.error} onRetry={() => void summary.refetch()} />;
  }

  const data = summary.data;
  const open = data.submitted + data.inProgress;
  const categoryData = (byCategory.data ?? []).filter((row) => row.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total" value={data.total} />
        <Kpi label="Open" value={open} />
        <Kpi label="Resolved" value={data.resolved} />
        <Kpi label="Overdue" value={data.overdue} warn />
        <Kpi label="Avg resolution" value={`${data.avgResolutionHours}h`} />
        <Kpi label="Avg rating" value={data.avgRating || "—"} />
        {isAdmin && accuracy.data ? (
          <Kpi label="AI accuracy" value={confidencePct(accuracy.data.categoryAccuracy)} />
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Complaints by category</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="count" nameKey="name" innerRadius={50} outerRadius={80}>
                  {categoryData.map((row, index) => (
                    <Cell key={row.id} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isAdmin ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Department performance</p>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" fill="#4f46e5" name="Open" />
                  <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
                  <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">30-day trend</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#4f46e5" name="Created" dot={false} />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isAdmin ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Avg resolution hours</p>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment.data ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={110} />
                  <Tooltip />
                  <Bar dataKey="avgResolutionHours" fill="#7c3aed" name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>

      {isAdmin ? <AiInsightsPanel /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/40 p-4 shadow-lg">
          <SectionHeader
            title="Recent complaints"
            to="/app/complaints"
            toLabel={isAdmin ? "View all complaints" : "View all my complaints"}
          />
          <ul className="mt-3 space-y-3">
            {(recent.data?.rows ?? []).map((row) => (
              <li key={row.id}>
                <ComplaintCard complaint={row} layout="row" />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-red-100 bg-gradient-to-br from-white to-rose-50/50 p-4 shadow-lg">
          <SectionHeader
            title="Overdue"
            to="/app/complaints?overdue=true"
            toLabel="View overdue complaints"
            tone="danger"
          />
          <ul className="mt-3 space-y-3">
            {(overdue.data?.rows ?? []).map((row) => (
              <li key={row.id}>
                <ComplaintCard complaint={row} layout="row" />
              </li>
            ))}
            {overdue.data?.rows.length === 0 ? <p className="text-sm text-slate-500">None overdue.</p> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
