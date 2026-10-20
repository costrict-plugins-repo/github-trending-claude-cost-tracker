import { NextRequest, NextResponse } from 'next/server';
import {
  getDailyCosts,
  getTotalStats,
  getCostByProject,
  getCostByTool,
  getCostByDeveloper,
  getRecentActivity,
  getAlerts,
  checkAlerts,
  getBudgets,
  getProjection,
  getEfficiencyScore,
  getDeveloperCount,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '14', 10);

    const daily = getDailyCosts(days);
    const totals = getTotalStats();
    const byProject = getCostByProject();
    const byTool = getCostByTool();
    const byDeveloper = getCostByDeveloper();
    const recent = getRecentActivity(20);
    const alerts = getAlerts();
    const { triggered, todayCost } = checkAlerts();
    const budgets = getBudgets();
    const projection = getProjection();
    const efficiency = getEfficiencyScore();
    const developerCount = getDeveloperCount();

    return NextResponse.json({
      daily,
      totals,
      byProject,
      byTool,
      byDeveloper,
      recent,
      alerts,
      triggeredAlerts: triggered,
      todayCost,
      budgets,
      projection,
      efficiency,
      developerCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
