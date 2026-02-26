import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface RawData {
  数据年月: string | number;
  商品编码?: string | number;
  商品名称?: string;
  贸易伙伴编码?: string | number;
  贸易伙伴名称: string;
  人民币: string | number;
}

export interface ProcessedData {
  年份: number;
  贸易伙伴名称: string;
  出口额: number;
  市场份额: number;
  同比增速: number | null;
  去年出口额: number;
}

export const parseFile = async (file: File): Promise<RawData[]> => {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    } else if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as RawData[]);
        },
        error: (error) => {
          reject(error);
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json as RawData[]);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Unsupported file format"));
    }
  });
};

export const processData = (rawData: RawData[]): ProcessedData[] => {
  // 1. Clean data and extract year
  const cleanedData = rawData.map(row => {
    let rmb = 0;
    if (row.人民币 !== undefined && row.人民币 !== null) {
      if (typeof row.人民币 === 'string') {
        rmb = parseFloat(row.人民币.replace(/,/g, '')) || 0;
      } else {
        rmb = row.人民币 || 0;
      }
    }

    const yearStr = String(row.数据年月);
    const year = parseInt(yearStr.substring(0, 4), 10);

    return {
      年份: year,
      贸易伙伴名称: row.贸易伙伴名称 || '未知',
      出口额: rmb
    };
  }).filter(row => !isNaN(row.年份));

  // 2. Aggregate by Year and Country
  const aggregated = cleanedData.reduce((acc, curr) => {
    const key = `${curr.年份}-${curr.贸易伙伴名称}`;
    if (!acc[key]) {
      acc[key] = { 年份: curr.年份, 贸易伙伴名称: curr.贸易伙伴名称, 出口额: 0 };
    }
    acc[key].出口额 += curr.出口额;
    return acc;
  }, {} as Record<string, { 年份: number, 贸易伙伴名称: string, 出口额: number }>);

  const aggregatedArray = Object.values(aggregated);

  // 3. Global total per year
  const globalTotal = aggregatedArray.reduce((acc, curr) => {
    acc[curr.年份] = (acc[curr.年份] || 0) + curr.出口额;
    return acc;
  }, {} as Record<number, number>);

  // 4. Calculate Market Share
  const withMarketShare = aggregatedArray.map(row => ({
    ...row,
    市场份额: row.出口额 / (globalTotal[row.年份] || 1)
  }));

  // 5. Calculate YoY Growth
  const finalData = withMarketShare.map(row => {
    const prevYearRow = withMarketShare.find(r => r.年份 === row.年份 - 1 && r.贸易伙伴名称 === row.贸易伙伴名称);
    const prevExport = prevYearRow ? prevYearRow.出口额 : 0;
    
    let yoyGrowth: number | null = null;
    if (prevExport !== 0) {
      yoyGrowth = (row.出口额 - prevExport) / Math.abs(prevExport);
    }

    return {
      ...row,
      去年出口额: prevExport,
      同比增速: yoyGrowth
    };
  });

  // 6. Sort by Year ASC, Export DESC
  finalData.sort((a, b) => {
    if (a.年份 !== b.年份) {
      return a.年份 - b.年份;
    }
    return b.出口额 - a.出口额;
  });

  return finalData;
};

export const downloadCSV = (data: ProcessedData[], filename: string) => {
  const csvData = data.filter(r => r.同比增速 !== null).map(row => ({
    年份: row.年份,
    贸易伙伴名称: row.贸易伙伴名称,
    市场份额: row.市场份额,
    同比增速: row.同比增速,
    市场份额_展示: `${(row.市场份额 * 100).toFixed(2)}%`,
    同比增速_展示: row.同比增速 !== null ? `${(row.同比增速 * 100).toFixed(1)}%` : ''
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
