import { NextResponse } from 'next/server';
import { handleMCPCall, MCP_TOOL_DEFINITIONS } from '@/mcp-server';
import { getLiveDataContext, getInitialDataContext } from '@/lib/data-context';
import { createClient } from '@/lib/supabase/server';

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
      const { name, arguments: args } = params || {};

      // 1. Check for external daemon secret
      const daemonSecret = request.headers.get('x-mcp-secret') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      const configuredSecret = process.env.MCP_SERVER_SECRET;
      const isAuthorizedDaemon = Boolean(configuredSecret && daemonSecret && daemonSecret === configuredSecret);

      let supabase;
      let tenantOrgId: string | null = null;
      let isSuperAdmin = false;

      if (!isAuthorizedDaemon) {
        // 2. Authenticate browser session via Supabase SSR
        supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            { error: { code: -32001, message: 'Unauthorized: Active user session or valid MCP secret required' } },
            { status: 401 }
          );
        }

        tenantOrgId = user.app_metadata?.organization_id || user.user_metadata?.organization_id || null;
        isSuperAdmin = (user.app_metadata?.role || user.user_metadata?.role) === 'SUPER_ADMIN';

        // 3. Strict Tenant Argument Validation: Non-superadmins cannot query another organization
        if (args?.organization_id && tenantOrgId && args.organization_id !== tenantOrgId && !isSuperAdmin) {
          return NextResponse.json(
            { error: { code: -32003, message: `Forbidden: Session tenant ${tenantOrgId} cannot access requested organization ${args.organization_id}` } },
            { status: 403 }
          );
        }
      } else {
        // Daemon with valid secret uses session or admin client
        supabase = await createClient();
      }

      // Enforce the caller's verified tenant if args omitted
      const effectiveOrgId = isAuthorizedDaemon
        ? (args?.organization_id || 'org_01')
        : (isSuperAdmin ? (args?.organization_id || tenantOrgId || 'org_01') : (tenantOrgId || args?.organization_id || 'org_01'));

      const sanitizedArgs = {
        organization_id: effectiveOrgId,
        store_id: args?.store_id || 'store_01',
        min_days: args?.min_days || 60,
        min_due: args?.min_due || 0,
        period_month: args?.period_month || 'August 2026',
        ...args,
      };

      let context;
      try {
        context = await getLiveDataContext(supabase);
        // If live database has no records (e.g. fresh DB before seeding), blend with initial data context
        if (!context.products || context.products.length === 0) {
          context = getInitialDataContext();
        }
      } catch (err: any) {
        console.warn('[MCP API Warning] Using fallback initial data context:', err.message);
        context = getInitialDataContext();
      }

      const result = handleMCPCall(name, sanitizedArgs, context);
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
