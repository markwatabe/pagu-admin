import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 4000, expenses: 2400 },
  { month: 'Feb', revenue: 3000, expenses: 1398 },
  { month: 'Mar', revenue: 5000, expenses: 3200 },
  { month: 'Apr', revenue: 4780, expenses: 2908 },
  { month: 'May', revenue: 5890, expenses: 4800 },
  { month: 'Jun', revenue: 6390, expenses: 3800 },
  { month: 'Jul', revenue: 7490, expenses: 4300 },
];

const visitorData = [
  { name: 'Mon', visitors: 2400 },
  { name: 'Tue', visitors: 1398 },
  { name: 'Wed', visitors: 4800 },
  { name: 'Thu', visitors: 3908 },
  { name: 'Fri', visitors: 4800 },
  { name: 'Sat', visitors: 3800 },
  { name: 'Sun', visitors: 4300 },
];

const categoryData = [
  { name: 'Appetizers', value: 35 },
  { name: 'Mains', value: 40 },
  { name: 'Desserts', value: 15 },
  { name: 'Drinks', value: 10 },
];

const radarData = [
  { subject: 'Flavor', A: 120, B: 110 },
  { subject: 'Presentation', A: 98, B: 130 },
  { subject: 'Value', A: 86, B: 130 },
  { subject: 'Speed', A: 99, B: 100 },
  { subject: 'Ambiance', A: 85, B: 90 },
  { subject: 'Service', A: 65, B: 85 },
];

const radialData = [
  { name: '5-star', uv: 78, fill: '#6366f1' },
  { name: '4-star', uv: 62, fill: '#818cf8' },
  { name: '3-star', uv: 45, fill: '#a5b4fc' },
  { name: '2-star', uv: 20, fill: '#c7d2fe' },
];

const PIE_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ChartExamplesPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Chart Examples</h1>
        <p className="mt-1 text-gray-500">Built with Recharts — the charting library behind shadcn/ui charts</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Area Chart */}
        <ChartCard title="Revenue vs Expenses (Area)">
          <AreaChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="#c7d2fe" fillOpacity={0.5} />
            <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="#fecdd3" fillOpacity={0.5} />
          </AreaChart>
        </ChartCard>

        {/* Bar Chart */}
        <ChartCard title="Weekly Visitors (Bar)">
          <BarChart data={visitorData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="visitors" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        {/* Line Chart */}
        <ChartCard title="Revenue Trend (Line)">
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ChartCard>

        {/* Pie Chart */}
        <ChartCard title="Menu Categories (Pie)">
          <PieChart>
            <Tooltip />
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {categoryData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartCard>

        {/* Radar Chart */}
        <ChartCard title="Restaurant Comparison (Radar)">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Radar name="Restaurant A" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
            <Radar name="Restaurant B" dataKey="B" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
          </RadarChart>
        </ChartCard>

        {/* Radial Bar Chart */}
        <ChartCard title="Review Ratings (Radial)">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="90%"
            data={radialData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar background dataKey="uv" />
            <Legend iconSize={10} layout="vertical" verticalAlign="bottom" />
            <Tooltip />
          </RadialBarChart>
        </ChartCard>
      </div>
    </section>
  );
}
