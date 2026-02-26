import React, { useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ProcessedData } from '../lib/dataUtils';

interface LineChartProps {
  data: ProcessedData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-bold text-gray-800">{label}年</p>
        <p className="text-sm text-gray-600">总出口额: {payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const plotData = useMemo(() => {
    const yearTotals = data.reduce((acc, curr) => {
      acc[curr.年份] = (acc[curr.年份] || 0) + curr.出口额;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(yearTotals)
      .map(([year, total]) => ({
        年份: parseInt(year, 10),
        总出口额: total
      }))
      .sort((a, b) => a.年份 - b.年份);
  }, [data]);

  if (plotData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        暂无数据
      </div>
    );
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={plotData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
          <XAxis dataKey="年份" />
          <YAxis 
            tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`} 
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="总出口额" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 8 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};
