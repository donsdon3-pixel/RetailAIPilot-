# RetailPilot AI - Model Context Protocol (MCP) Server

This MCP server equips AI models (Claude Desktop, Cursor, Antigravity, OpenAI Assistants) with live, non-hallucinated database access to the RetailPilot AI multi-tenant SaaS ledger.

## 🛠 Available MCP Tools

| Tool Name | Purpose | Parameters |
| :--- | :--- | :--- |
| `get_low_stock_products` | Returns SKUs where stock $\le$ reorder threshold with velocity data | `store_id`, `threshold_days` |
| `get_dead_stock` | Identifies high-value inventory with zero sales in 60+ days | `organization_id`, `min_days` |
| `get_profitability` | Computes Gross Sales - COGS - Store Operating Expenses | `store_id`, `start_date`, `end_date` |
| `get_supplier_outstanding` | Aggregates unpaid AP, credit terms, and due dates | `organization_id`, `min_due` |
| `generate_business_report` | Generates structured JSON for executive diagnostic reports | `organization_id`, `period_month` |

## 🔌 Connection Setup

### Claude Desktop / Cursor Configuration

Add this entry to your `claude_desktop_config.json` or MCP settings:

```json
{
  "mcpServers": {
    "retailpilot-ai": {
      "command": "node",
      "args": ["<PATH_TO_PROJECT>/RetailAIPilot/dist-mcp/index.js"]
    }
  }
}
```

### HTTP Endpoint Access

RetailPilot AI also exposes these tools via its Next.js REST/JSON-RPC route:

```http
POST /api/mcp
Content-Type: application/json

{
  "method": "tools/call",
  "params": {
    "name": "get_low_stock_products",
    "arguments": {
      "store_id": "store_01",
      "threshold_days": 7
    }
  }
}
```
