import React, { useState, useMemo } from 'react';
import { Upload, Download, BarChart2, TrendingUp, Table as TableIcon } from 'lucide-react';
import { RawData, ProcessedData, parseFile, processData, downloadCSV } from './lib/dataUtils';
import { LineChart } from './components/LineChart';
import { BCGMatrix } from './components/BCGMatrix';
import { cn } from './lib/utils';

export default function App() {
  const [rawData, setRawData] = useState<RawData[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trend' | 'bcg' | 'data'>('trend');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const availableYears = useMemo(() => {
    if (!processedData.length) return [];
    const years = Array.from(new Set(processedData.map(d => d.年份))).sort((a: number, b: number) => a - b);
    return years;
  }, [processedData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const parsed = await parseFile(file);
      setRawData(parsed);
      
      const processed = processData(parsed);
      setProcessedData(processed);
      
      const years = Array.from(new Set(processed.map(d => d.年份))).sort((a: number, b: number) => a - b);
      if (years.length > 0) {
        setSelectedYear(years[years.length - 1]); // Default to latest year
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (processedData.length === 0) return;
    downloadCSV(processedData, 'CoreMetrics_Data.csv');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Data Analysis & BCG Matrix</h1>
        </div>
        {processedData.length > 0 && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            下载处理后数据
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] max-w-2xl mx-auto text-center">
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 w-full">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">上传数据文件</h2>
              <p className="text-slate-500 mb-8">支持 CSV, Excel (.xlsx), 或 JSON 格式。包含字段：数据年月, 商品编码, 商品名称, 贸易伙伴编码, 贸易伙伴名称, 人民币</p>
              
              <label className="cursor-pointer inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                <span>选择文件</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv, .xlsx, .xls, .json" 
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>
              {loading && <p className="mt-4 text-sm text-indigo-600 animate-pulse">正在处理数据...</p>}
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('trend')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'trend' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                出口额趋势
              </button>
              <button
                onClick={() => setActiveTab('bcg')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'bcg' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <BarChart2 className="w-4 h-4" />
                波士顿矩阵
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'data' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <TableIcon className="w-4 h-4" />
                数据预览
              </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              {activeTab === 'trend' && (
                <div>
                  <h3 className="text-lg font-bold mb-6">历年总出口额趋势</h3>
                  <LineChart data={processedData} />
                </div>
              )}

              {activeTab === 'bcg' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">波士顿矩阵分析 (Top 35 核心市场)</h3>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-600">选择年份:</label>
                      <select 
                        value={selectedYear || ''} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {availableYears.map(y => (
                          <option key={y} value={y}>{y} 年</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {selectedYear && <BCGMatrix data={processedData} year={selectedYear} />}
                  <div className="mt-4 text-xs text-slate-500 text-center">
                    注: X轴为市场份额(对数刻度)，Y轴为同比增速(受限于上方调节面板)，气泡大小代表出口额。
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div>
                  <h3 className="text-lg font-bold mb-6">处理后数据预览 (前 100 条)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">年份</th>
                          <th className="px-4 py-3">贸易伙伴名称</th>
                          <th className="px-4 py-3 text-right">出口额</th>
                          <th className="px-4 py-3 text-right">市场份额</th>
                          <th className="px-4 py-3 text-right">同比增速</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedData.slice(0, 100).map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3">{row.年份}</td>
                            <td className="px-4 py-3 font-medium">{row.贸易伙伴名称}</td>
                            <td className="px-4 py-3 text-right">{row.出口额.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{(row.市场份额 * 100).toFixed(2)}%</td>
                            <td className="px-4 py-3 text-right">
                              {row.同比增速 !== null ? (
                                <span className={row.同比增速 > 0 ? 'text-emerald-600' : 'text-red-600'}>
                                  {(row.同比增速 * 100).toFixed(1)}%
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
