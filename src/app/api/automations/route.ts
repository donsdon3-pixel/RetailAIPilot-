import { NextResponse } from 'next/server';
import { AppStore } from '@/lib/store';

export async function POST(request: Request) {
  try {
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
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
