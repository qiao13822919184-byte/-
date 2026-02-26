import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList
} from 'recharts';
import { Copy, Check } from 'lucide-react';
import { ProcessedData } from '../lib/dataUtils';

interface BCGMatrixProps {
  data: ProcessedData[];
  year: number;
}

const formatPercent = (value: number) => {
  if (value >= 0.01) {
    return `${(value * 100).toPrecision(3)}%`;
  } else {
    return `${(value * 100).toPrecision(2)}%`;
  }
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md z-50">
        <p className="font-bold text-gray-800 text-lg">{data.贸易伙伴名称}</p>
        <p className="text-sm text-gray-600">市场份额: {(data.市场份额 * 100).toFixed(2)}%</p>
        <p className="text-sm text-gray-600">同比增速: {(data.同比增速 * 100).toFixed(2)}%</p>
        <p className="text-sm text-gray-600">出口额: {data.出口额.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const CustomLabel = (props: any) => {
  const { x, y, value } = props;
  if (!value) return null;
  return (
    <text
      x={x}
      y={y - 12}
      fill="#1f2937"
      fontSize={13}
      fontWeight="900"
      textAnchor="middle"
      stroke="#ffffff"
      strokeWidth={4}
      paintOrder="stroke"
      className="pointer-events-none drop-shadow-sm"
    >
      {value}
    </text>
  );
};

export const BCGMatrix: React.FC<BCGMatrixProps> = ({ data, year }) => {
  const [yMin, setYMin] = useState<number>(-1);
  const [yMax, setYMax] = useState<number>(3);
  const [minShare, setMinShare] = useState<number>(0);
  const [maxShare, setMaxShare] = useState<number>(100);
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { plotData, xRef, yRef } = useMemo(() => {
    let filtered = data.filter(d => d.年份 === year && d.同比增速 !== null && d.市场份额 > 0);
    
    // Apply Market Share Filter
    filtered = filtered.filter(d => {
      const sharePct = d.市场份额 * 100;
      return sharePct >= minShare && sharePct <= maxShare;
    });

    // Apply Country Filter
    if (countryFilter.trim()) {
      const keywords = countryFilter.split(/[,，]/).map(k => k.trim()).filter(k => k);
      if (keywords.length > 0) {
        filtered = filtered.filter(d => keywords.some(k => d.贸易伙伴名称.includes(k)));
      }
    }

    // Sort by export value desc to get top 35
    filtered.sort((a, b) => b.出口额 - a.出口额);
    filtered = filtered.slice(0, 35);

    if (filtered.length === 0) {
      return { plotData: [], xRef: 0, yRef: 0 };
    }

    // Calculate reference lines based on the filtered data
    const calculatedXRef = filtered.reduce((sum, d) => sum + d.市场份额, 0) / filtered.length;
    const calculatedYRef = 0;

    const mappedData = filtered.map((d, index) => {
      const yPlot = Math.max(yMin, Math.min(d.同比增速 as number, yMax));
      
      // Determine quadrant color based on classification
      let fill = '#ef4444'; // default red
      const isHighShare = d.市场份额 >= calculatedXRef;
      const isHighGrowth = yPlot >= calculatedYRef;

      if (isHighShare && isHighGrowth) {
        fill = '#10b981'; // Green (High Share, High Growth)
      } else if (!isHighShare && isHighGrowth) {
        fill = '#f59e0b'; // Amber/Yellow (Low Share, High Growth)
      } else if (isHighShare && !isHighGrowth) {
        fill = '#3b82f6'; // Blue (High Share, Low Growth)
      } else {
        fill = '#ef4444'; // Red (Low Share, Low Growth)
      }

      return {
        ...d,
        yPlot,
        label: index < 20 ? d.贸易伙伴名称 : '',
        fill
      };
    });

    return { plotData: mappedData, xRef: calculatedXRef, yRef: calculatedYRef };
  }, [data, year, yMin, yMax, minShare, maxShare, countryFilter]);

  const handleCopy = () => {
    // Use tab separators so it pastes perfectly into Excel/Sheets
    const header = "日期\t贸易伙伴名称\t出口额\t同比增速\t市场份额\n";
    const rows = plotData.map(d => {
      const exportVal = d.出口额.toLocaleString();
      const yoy = d.同比增速 !== null ? `${(d.同比增速 * 100).toFixed(2)}%` : '-';
      const share = `${(d.市场份额 * 100).toFixed(2)}%`;
      return `${d.年份}\t${d.贸易伙伴名称}\t${exportVal}\t${yoy}\t${share}`;
    }).join('\n');
    
    navigator.clipboard.writeText(header + rows).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (plotData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-gray-500">
        <p className="mb-4">{year} 年无符合条件的数据</p>
        <button 
          onClick={() => { setYMin(-1); setYMax(3); setMinShare(0); setMaxShare(100); setCountryFilter(''); }}
          className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors font-medium"
        >
          重置筛选条件
        </button>
      </div>
    );
  }

  const minX = Math.min(...plotData.map(d => d.市场份额));
  const maxX = Math.max(...plotData.map(d => d.市场份额));
  
  const xDomain = [minX * 0.6, maxX * 1.8];
  const yDomain = [yMin - 0.1, yMax + 0.1]; // Dynamic Y domain based on user input

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Control Panel */}
      <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-100 rounded-xl border border-slate-200 shadow-sm relative">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">Y轴增速下限 (小数)</label>
          <input 
            type="number" 
            step="0.1"
            value={yMin} 
            onChange={e => setYMin(Number(e.target.value))}
            className="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">Y轴增速上限 (小数)</label>
          <input 
            type="number" 
            step="0.1"
            value={yMax} 
            onChange={e => setYMax(Number(e.target.value))}
            className="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">最小份额 (%)</label>
          <input 
            type="number" 
            step="0.01"
            min="0"
            value={minShare} 
            onChange={e => setMinShare(Number(e.target.value))}
            className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">最大份额 (%)</label>
          <input 
            type="number" 
            step="0.01"
            max="100"
            value={maxShare} 
            onChange={e => setMaxShare(Number(e.target.value))}
            className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
          <label className="text-xs font-bold text-slate-700">筛选国家 (逗号分隔)</label>
          <input 
            type="text" 
            placeholder="例如: 美国, 日本"
            value={countryFilter} 
            onChange={e => setCountryFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          {copied ? '已复制' : '复制筛选数据'}
        </button>
      </div>

      {/* Chart Area */}
      <div className="w-full h-[600px] relative mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
            <XAxis 
              type="number" 
              dataKey="市场份额" 
              name="市场份额" 
              scale="log" 
              domain={xDomain} 
              tickFormatter={formatPercent}
              tick={{ fontSize: 14, fontWeight: 'bold', fill: '#334155' }}
            />
            <YAxis 
              type="number" 
              dataKey="yPlot" 
              name="同比增速" 
              domain={yDomain} 
              tickFormatter={formatPercent}
              tick={{ fontSize: 14, fontWeight: 'bold', fill: '#334155' }}
            />
            <ZAxis 
              type="number" 
              dataKey="出口额" 
              range={[150, 3500]} 
              name="出口额" 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            
            <ReferenceLine y={yRef} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" opacity={0.8} />
            <ReferenceLine x={xRef} stroke="#64748b" strokeWidth={2} strokeDasharray="4 4" opacity={0.8} />
            
            <Scatter data={plotData}>
              {plotData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="#1e293b" strokeWidth={1.5} opacity={0.75} />
              ))}
              <LabelList dataKey="label" content={<CustomLabel />} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        {/* Quadrant Labels */}
        <div className="absolute top-6 right-8 text-emerald-600 font-extrabold opacity-60 pointer-events-none text-xl tracking-wider drop-shadow-sm">(高份额, 高增长)</div>
        <div className="absolute top-6 left-20 text-amber-500 font-extrabold opacity-60 pointer-events-none text-xl tracking-wider drop-shadow-sm">(低份额, 高增长)</div>
        <div className="absolute bottom-16 right-8 text-blue-600 font-extrabold opacity-60 pointer-events-none text-xl tracking-wider drop-shadow-sm">(高份额, 负增长)</div>
        <div className="absolute bottom-16 left-20 text-rose-600 font-extrabold opacity-60 pointer-events-none text-xl tracking-wider drop-shadow-sm">(低份额, 负增长)</div>
      </div>
    </div>
  );
};
