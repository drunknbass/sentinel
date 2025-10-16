import { NextRequest, NextResponse } from 'next/server';
import { trackPageView, getPageViews, getTodayViews } from '@/lib/analytics';

export const runtime = 'edge';

/**
 * GET /api/analytics
 * Returns page view statistics
 *
 * Query params:
 * - days: Number of days to retrieve (default: 7)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const [views, todayViews] = await Promise.all([
      getPageViews(days),
      getTodayViews()
    ]);

    return NextResponse.json({
      today: todayViews,
      history: views
    });
  } catch (error) {
    console.error('[ANALYTICS API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

/**
 * POST /api/analytics
 * Track a page view
 */
export async function POST() {
  try {
    await trackPageView();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ANALYTICS API] Error tracking view:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}
