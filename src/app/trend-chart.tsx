import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRM, type TrendPoint } from "@/lib/budget";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: MONTHS[Number(d.month.slice(5)) - 1] }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis width={40} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(v: number) => String(Math.round(v / 100))} />
          <Tooltip cursor={{ fill: "var(--line)", opacity: 0.5 }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line-strong)", borderRadius: 12, color: "var(--ink)" }} formatter={(v) => formatRM(Number(v))} labelFormatter={(_, p) => p[0]?.payload.month} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
          <Bar dataKey="incomeSen" name="Income" fill="var(--income)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="fixedSen" name="Fixed" fill="var(--fixed)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="variableSen" name="Variable" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
