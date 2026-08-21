import { NextResponse } from 'next/server';
import { handleMCPCall, MCP_TOOL_DEFINITIONS } from '@/mcp-server';
import { AppStore } from '@/lib/store';

export async function GET() {
  return NextResponse.json({
    jsonrpc: '2.0',
    tools: MCP_TOOL_DEFINITIONS,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { method, params } = body;

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        result: { tools: MCP_TOOL_DEFINITIONS },
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const context = AppStore.getDataContext();
      const result = handleMCPCall(name, args || {}, context);
      return NextResponse.json({
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      });
    }

    return NextResponse.json(
      { error: { code: -32601, message: 'Method not found' } },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: -32603, message: error.message } },
      { status: 500 }
    );
  }
}
