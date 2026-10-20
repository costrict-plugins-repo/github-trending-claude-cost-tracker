import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, createAlert, deleteAlert, toggleAlert, checkAlerts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const alerts = getAlerts();
    const { triggered, todayCost } = checkAlerts();
    return NextResponse.json({ alerts, triggered, todayCost });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { threshold_usd?: number };
    if (!body.threshold_usd || body.threshold_usd <= 0) {
      return NextResponse.json({ error: 'threshold_usd must be a positive number' }, { status: 400 });
    }
    const alert = createAlert(body.threshold_usd);
    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    deleteAlert(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { id?: number; enabled?: boolean };
    if (!body.id || typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'id and enabled are required' }, { status: 400 });
    }
    toggleAlert(body.id, body.enabled);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
