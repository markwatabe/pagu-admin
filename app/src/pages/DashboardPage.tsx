import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { db } from '../lib/db';

interface EventRecord {
  id: string;
  name: string;
  type: string;
  date: number;
  revenue: number;
  guests: number;
  notes?: string;
}

function generateMockProfit() {
  const data: Record<string, number> = {};
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const base = 1800 + Math.random() * 1200;
    const dayOfWeek = d.getDay();
    const modifier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;
    data[d.toISOString().slice(0, 10)] = Math.round(base * modifier);
  }
  return data;
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function eventLabel(type: string) {
  return type === 'buyout' ? 'Buyout' : 'Large Party';
}

interface ChartRow {
  dateKey: string;
  date: string;
  profit: number;
  eventRevenue: number;
  event?: EventRecord;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as ChartRow | undefined;
  const profit = row?.profit ?? 0;
  const event = row?.event;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">
        Profit: <span className="font-semibold">${profit.toLocaleString()}</span>
      </p>
      {event && (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <p className="text-sm font-semibold text-gray-900">{event.name}</p>
          <p className="text-xs text-gray-500">
            {eventLabel(event.type)} &middot; {event.guests} guests &middot; ${event.revenue.toLocaleString()}
          </p>
          {event.notes && (
            <p className="mt-1 text-xs italic text-gray-400">{event.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { orgId } = useParams();
  const { data: eventsData } = db.useQuery(
    orgId
      ? { events: { $: { where: { 'org.id': orgId } } } }
      : null,
  );

  const events: EventRecord[] = (eventsData?.events ?? []) as EventRecord[];

  const mockProfit = useMemo(() => generateMockProfit(), []);

  const chartData = useMemo(() => {
    const eventsByDate = new Map<string, EventRecord>();
    for (const e of events) {
      const iso = new Date(e.date).toISOString().slice(0, 10);
      eventsByDate.set(iso, e);
    }

    const rows: ChartRow[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const event = eventsByDate.get(dateKey);
      rows.push({
        dateKey,
        date: formatDate(dateKey),
        profit: mockProfit[dateKey] ?? 0,
        eventRevenue: event?.revenue ?? 0,
        event,
      });
    }
    return rows;
  }, [events, mockProfit]);

  const total = chartData.reduce((s, d) => s + d.profit, 0);
  const avg = Math.round(total / chartData.length);
  const best = Math.max(...chartData.map((d) => d.profit));
  const eventCount = events.length;

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Daily profit and events over the past 14 days</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Profit" value={`$${total.toLocaleString()}`} />
        <StatCard label="Daily Avg" value={`$${avg.toLocaleString()}`} />
        <StatCard label="Best Day" value={`$${best.toLocaleString()}`} />
        <StatCard label="Events" value={String(eventCount)} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value: string) =>
                value === 'profit' ? 'Daily Profit' : 'Event Revenue'
              }
            />
            <Bar
              dataKey="eventRevenue"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              barSize={24}
              opacity={0.8}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 5, fill: '#6366f1' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
