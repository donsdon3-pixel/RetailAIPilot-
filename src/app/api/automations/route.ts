import { NextResponse } from 'next/server';
import { AppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Check CRON_SECRET for automated schedules
    const authHeader = request.headers.get('authorization') || '';
    const cronToken = authHeader.replace(/^Bearer\s+/i, '') || request.headers.get('x-cron-secret') || '';
    const configuredCronSecret = process.env.CRON_SECRET;
    const isAuthorizedCron = Boolean(configuredCronSecret && cronToken && cronToken === configuredCronSecret);

    if (!isAuthorizedCron) {
      // 2. Check authenticated browser session
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized: Valid CRON_SECRET bearer token or active user session required' },
          { status: 401 }
        );
      }
    }

    const { workflowIndex } = await request.json();
    const idx = parseInt(workflowIndex, 10);

    if (idx < 1 || idx > 5) {
      return NextResponse.json(
        { error: 'Workflow index must be between 1 and 5' },
        { status: 400 }
      );
    }

    const result = AppStore.runAutomation(idx as 1 | 2 | 3 | 4 | 5);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const cronToken = authHeader.replace(/^Bearer\s+/i, '') || request.headers.get('x-cron-secret') || '';
    const configuredCronSecret = process.env.CRON_SECRET;
    const isAuthorizedCron = Boolean(configuredCronSecret && cronToken && cronToken === configuredCronSecret);

    if (!isAuthorizedCron) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized: Valid CRON_SECRET bearer token or active user session required' },
          { status: 401 }
        );
      }
    }

    // Run all 5 autonomous background workflows
    const results = [1, 2, 3, 4, 5].map((idx) => AppStore.runAutomation(idx as 1 | 2 | 3 | 4 | 5));

    return NextResponse.json({
      success: true,
      executed_at: new Date().toISOString(),
      workflows_executed: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


