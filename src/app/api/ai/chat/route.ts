import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Active user session required' },
        { status: 401 }
      );
    }

    const { prompt, orgId, storeId } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const userOrgId =
      user.app_metadata?.organization_id ||
      user.user_metadata?.organization_id ||
      orgId ||
      'org_01';

    const aiMessage = await AIService.processQuery(
      prompt,
      userOrgId,
      storeId || 'store_01'
    );

    return NextResponse.json({
      success: true,
      message: aiMessage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

