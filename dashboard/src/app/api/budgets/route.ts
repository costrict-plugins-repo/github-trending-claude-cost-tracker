import { NextRequest, NextResponse } from 'next/server';
import { getBudgets, createBudget, deleteBudget } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(getBudgets());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { type?: string; limit_usd?: number };
    const type = body.type || 'daily';
    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return NextResponse.json({ error: 'type must be daily, weekly, or monthly' }, { status: 400 });
    }
    if (!body.limit_usd || body.limit_usd <= 0) {
      return NextResponse.json({ error: 'limit_usd must be a positive number' }, { status: 400 });
    }
    const budget = createBudget(type, body.limit_usd);
    return NextResponse.json(budget, { status: 201 });
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
    deleteBudget(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
