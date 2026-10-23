import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function WorkloadChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-400">
        No workload distribution data available.
      </div>
    );
  }

  // Transform data if needed for Recharts
  const chartData = data.map(item => ({
    name: item.name || 'Member',
    tasks: item.tasks_assigned || item.assigned_tasks || 0,
    points: item.points || item.story_points || 0,
    share: item.workload_share || item.estimated_workload_share || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1">
          <p className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1">{label}</p>
          <p className="flex justify-between gap-4">
            <span className="text-slate-400">Assigned Tasks:</span>
            <span className="font-medium">{payload[0]?.value} tasks</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-slate-400">Story Points:</span>
            <span className="font-medium">{payload[1]?.value} pts</span>
          </p>
          <p className="flex justify-between gap-4 text-purple-300">
            <span>Workload Share:</span>
            <span className="font-semibold">{chartData.find(d => d.name === label)?.share}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
          />
          <Bar
            name="Assigned Tasks"
            dataKey="tasks"
            fill="#a78bfa"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            name="Story Points"
            dataKey="points"
            fill="#7c3aed"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
