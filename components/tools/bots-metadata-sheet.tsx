'use client';

import { unparse } from 'papaparse';
import { useEffect, useState } from 'react';
import { SpreadsheetEditor } from '../artifact/sheet/sheet-editor';

interface Bot {
  id: string;
  status: string;
  created_at: string;
  meeting_url?: string;
  bot_name?: string;
  [key: string]: any; // For other properties that might be present
}

interface BotsMetadataSheetProps {
  botsData: Bot[];
  isLoading?: boolean;
}

export function BotsMetadataSheet({ botsData, isLoading = false }: BotsMetadataSheetProps) {
  const [csvContent, setCsvContent] = useState('');
  
  useEffect(() => {
    if (botsData && botsData.length > 0) {
      // Extract headers from the first bot's keys, ensuring important ones come first
      const priorityKeys = ['id', 'bot_name', 'status', 'created_at', 'meeting_url'];
      const allKeys = Array.from(new Set([
        ...priorityKeys,
        ...botsData.flatMap(bot => Object.keys(bot))
      ]));
      
      // Transform data for CSV
      const rows = botsData.map(bot => {
        const row: any = {};
        allKeys.forEach(key => {
          // Format dates
          if (key === 'created_at' && bot[key]) {
            row[key] = new Date(bot[key]).toLocaleString();
          } else {
            row[key] = bot[key] !== undefined ? bot[key] : '';
          }
        });
        return row;
      });
      
      // Generate CSV
      const csv = unparse(rows);
      setCsvContent(csv);
    }
  }, [botsData]);

  if (isLoading) {
    return <div className="p-4">Loading bot metadata...</div>;
  }

  if (!botsData || botsData.length === 0) {
    return <div className="p-4">No bot data available.</div>;
  }

  return (
    <div className="w-full h-[500px] border rounded-md overflow-hidden">
      <SpreadsheetEditor
        content={csvContent}
        saveContent={() => {}} // Read-only view
        status="idle"
        isCurrentVersion={true}
        currentVersionIndex={0}
      />
    </div>
  );
} 