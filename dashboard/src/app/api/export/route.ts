import { NextRequest, NextResponse } from 'next/server';
import { getAllRecords } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CSV_HEADERS = [
  'id', 'timestamp', 'developer', 'developer_email', 'project', 'tool_name',
  'file_path', 'input_tokens', 'output_tokens', 'cache_read_tokens',
  'cache_creation_tokens', 'cost_usd', 'session_id',
];

function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const days = parseInt(searchParams.get('days') || '30', 10);

    const records = getAllRecords(days);

    if (format === 'json') {
      return new NextResponse(JSON.stringify(records, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="claude-usage-${days}d.json"`,
        },
      });
    }

    const lines = [CSV_HEADERS.join(',')];
    for (const r of records) {
      const row = CSV_HEADERS.map(h => escapeCsvField(r[h as keyof typeof r]));
      lines.push(row.join(','));
    }

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="claude-usage-${days}d.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
