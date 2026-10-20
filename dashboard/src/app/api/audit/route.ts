import { NextResponse } from 'next/server';
import { getAuditLog } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(getAuditLog(50));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
