import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';

export async function POST(request: Request) {
  try {
    const { prompt, orgId, storeId } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const aiMessage = await AIService.processQuery(
      prompt,
      orgId || 'org_01',
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
