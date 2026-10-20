import { NextRequest, NextResponse } from 'next/server';
import { getSessionSummaries, getSessionDetails } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (sessionId) {
      return NextResponse.json(getSessionDetails(sessionId));
    }

    return NextResponse.json(getSessionSummaries(20));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
