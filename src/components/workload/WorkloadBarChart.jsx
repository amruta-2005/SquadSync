import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';

export default function WorkloadBarChart({ members = [] }) {
  if (!members || members.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-400">
        No team members data available.
      </div>
    );
  }

  const chartData = members.map(m => ({
    name: m.name,
    storyPoints: m.story_points || 0,
    assignedTasks: m.assigned_tasks || 0,
    completedTasks: m.completed_tasks || 0,
    workloadShare: m.estimated_workload_share || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const member = members.find(m => m.name === label);
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-xl text-xs space-y-1.5 min-w-[200px]">
          <div className="border-b border-slate-700 pb-1 flex justify-between items-center">
            <span className="font-semibold text-slate-200">{label}</span>
            <span className="text-[11px] text-purple-300 font-medium">{member?.role}</span>
          </div>
          <p className="flex justify-between text-purple-400">
            <span>Workload Share:</span>
            <span className="font-bold">{payload[0]?.payload?.workloadShare}%</span>
          </p>
          <p className="flex justify-between text-slate-300">
            <span>Story Points:</span>
            <span className="font-medium">{payload[0]?.payload?.storyPoints} pts</span>
          </p>
          <p className="flex justify-between text-slate-300">
            <span>Assigned Tasks:</span>
            <span className="font-medium">{payload[0]?.payload?.assignedTasks} tasks</span>
          </p>
          <p className="flex justify-between text-emerald-400">
            <span>Completed Tasks:</span>
            <span className="font-medium">{payload[0]?.payload?.completedTasks} tasks</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
          barGap={8}
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
            wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
          />
          <Bar
            name="Story Points"
            dataKey="storyPoints"
            fill="#7c3aed"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            name="Assigned Tasks"
            dataKey="assignedTasks"
            fill="#a78bfa"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            name="Completed Tasks"
            dataKey="completedTasks"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
