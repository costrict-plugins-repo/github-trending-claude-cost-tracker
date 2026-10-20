import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = getHealthStatus();
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
