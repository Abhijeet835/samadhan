import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#16a34a', '#db2777', '#475569'];

export default function AdminCharts({ data }) {
  const { t } = useTranslation();
  const issuesSeries = Object.entries(data.series.issuesPerDay).map(([day, n]) => ({ day: day.slice(5), n }));
  const feesSeries = Object.entries(data.series.feesPerDay).map(([day, v]) => ({ day: day.slice(5), gross: v.grossFeesPaise / 100, refunds: v.refundsPaise / 100 }));
  const byCategory = Object.entries(data.issues.byCategory).map(([name, value]) => ({
    name: t(`issues.categories.${name}`, name),
    value,
  }));
  const byStatus = Object.entries(data.issues.byStatus).map(([name, value]) => ({
    name: t(`issues.statuses.${name}`, name),
    value,
  }));

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-semibold text-slate-700">{t('admin.chart.issuesPerDay')}</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={issuesSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" fontSize={10} /><YAxis fontSize={10} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="n" stroke="#2563eb" strokeWidth={2} dot={false} /></LineChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-semibold text-slate-700">{t('admin.chart.feesVsRefunds')}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={feesSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Legend /><Bar dataKey="gross" fill="#0f766e" /><Bar dataKey="refunds" fill="#dc2626" /></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-semibold text-slate-700">{t('admin.chart.byCategory')}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byCategory} layout="vertical" margin={{ left: 10, right: 12 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={10} allowDecimals={false} /><YAxis type="category" dataKey="name" fontSize={10} width={125} /><Tooltip /><Bar dataKey="value" fill="#2563eb" /></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-semibold text-slate-700">{t('admin.chart.byStatus')}</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart><Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} label>{byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
