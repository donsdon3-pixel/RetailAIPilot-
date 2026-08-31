export type UserRole =
  | 'SUPER_ADMIN'
  | 'BUSINESS_OWNER'
  | 'STORE_MANAGER'
  | 'SALES_STAFF'
  | 'INVENTORY_STAFF'
  | 'CUSTOMER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  subscription_status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  currency: string;
  tax_rate: number;
  gstin?: string;
  logo_url?: string;
  created_at: string;
}

export interface Store {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state?: string;
  postal_code?: string;
  gstin?: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  organization_id?: string;
  store_id?: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  last_login?: string;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  gstin?: string;
  credit_period_days: number;
  outstanding_balance: number;
}

export interface Product {
  id: string;
  organization_id: string;
  category_id: string;
  category_name?: string;
  supplier_id: string;
  supplier_name?: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  unit_cost: number;
  selling_price: number;
  reorder_point: number;
  reorder_quantity: number;
  is_active: boolean;
}

export type MovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'DAMAGED'
  | 'ADJUSTMENT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN';

export interface InventoryLedgerEntry {
  id: string;
  organization_id: string;
  store_id: string;
  store_name?: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  movement_type: MovementType;
  quantity_change: number; // Positive or negative
  unit_cost: number;
  total_cost: number;
  reference_id?: string;
  return_order_id?: string;
  return_item_id?: string;
  linked_movement_id?: string; // Foreign key linking DAMAGED write-off to its corresponding RETURN entry
  reason?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface InventoryBalance {
  organization_id: string;
  store_id: string;
  store_name?: string;
  product_id: string;
  sku: string;
  product_name: string;
  category_name?: string;
  unit_cost: number;
  selling_price: number;
  reorder_point: number;
  current_stock: number;
  total_inventory_valuation: number;
  is_low_stock: boolean;
  days_without_sale?: number;
}

export type TransferStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity_requested: number;
  quantity_sent: number;
  quantity_received: number;
}

export interface StockTransfer {
  id: string;
  organization_id: string;
  transfer_number: string;
  source_store_id: string;
  source_store_name?: string;
  destination_store_id: string;
  destination_store_name?: string;
  status: TransferStatus;
  requested_by?: string;
  approved_by?: string;
  dispatched_by?: string;
  received_by?: string;
  notes?: string;
  items: StockTransferItem[];
  created_at: string;
  updated_at: string;
}

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'UPI'
  | 'LOYALTY_POINTS'
  | 'SPLIT';

export interface PaymentRecord {
  id: string;
  sales_order_id: string;
  payment_method: PaymentMethod;
  amount: number;
  reference_transaction_id?: string;
  created_at: string;
}

export interface SalesItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  subtotal: number;
  cogs: number;
  tax_rate?: number;
  discount_amount?: number;
}

export interface SalesOrder {
  id: string;
  organization_id: string;
  store_id: string;
  store_name?: string;
  customer_id?: string;
  customer_name?: string;
  cashier_id?: string;
  cashier_name?: string;
  invoice_number: string;
  subtotal: number;
  taxable_amount?: number;
  tax_amount: number;
  cgst_amount?: number;
  sgst_amount?: number;
  discount_amount: number;
  total_amount: number;
  cogs_amount: number;
  payments: PaymentRecord[];
  items: SalesItem[];
  status: 'COMPLETED' | 'RETURNED' | 'PARTIALLY_RETURNED';
  created_at: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  refund_unit_price: number;
  condition: 'RESTOCKABLE' | 'DAMAGED';
}

export interface ReturnOrder {
  id: string;
  organization_id: string;
  store_id: string;
  sales_order_id: string;
  invoice_number: string;
  return_number: string;
  refund_amount: number;
  reason: string;
  items: ReturnItem[];
  processed_by?: string;
  processed_by_name?: string;
  created_at: string;
}

export type POStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  store_id: string;
  supplier_id: string;
  supplier_name: string;
  po_number: string;
  status: POStatus;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_due_date: string;
  items: PurchaseOrderItem[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface GoodsReceiptNote {
  id: string;
  organization_id: string;
  store_id: string;
  purchase_order_id: string;
  po_number: string;
  grn_number: string;
  received_by?: string;
  received_by_name?: string;
  inspection_notes: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  store_id: string;
  category_id: string;
  category_name: string;
  title: string;
  amount: number;
  expense_date: string;
  logged_by?: string;
  notes?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  loyalty_points: number;
  total_spend: number;
  created_at: string;
}

export interface Promotion {
  id: string;
  organization_id: string;
  title: string;
  discount_percentage: number;
  target_tier: string;
  valid_until: string;
  code: string;
}

export interface AutomationLog {
  id: string;
  organization_id: string;
  workflow_name: string;
  execution_status: 'SUCCESS' | 'WARNING' | 'ERROR';
  payload?: any;
  result_summary: string;
  triggered_at: string;
}

export interface SystemAlert {
  id: string;
  organization_id: string;
  store_id?: string;
  alert_type: 'LOW_STOCK' | 'DEAD_STOCK' | 'SUPPLIER_PAYMENT' | 'EOD_SALES' | 'MONTHLY_REPORT' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

// MCP Specific Interfaces
export interface LowStockProductResult {
  product_id: string;
  sku: string;
  name: string;
  current_stock: number;
  reorder_point: number;
  daily_sales_velocity: number;
  days_until_stockout: number;
  recommended_reorder_qty: number;
  supplier_id: string;
  supplier_name: string;
}

export interface DeadStockProductResult {
  product_id: string;
  sku: string;
  name: string;
  current_stock: number;
  unit_cost: number;
  tied_up_capital: number;
  days_without_sale: number;
  suggested_discount_percent: number;
  liquidation_action: string;
}

export interface ProfitabilityResult {
  store_id: string;
  store_name: string;
  period: { start_date: string; end_date: string };
  gross_sales: number;
  cogs: number;
  gross_profit: number;
  gross_margin_percent: number;
  operating_expenses: number;
  net_profit: number;
  net_margin_percent: number;
  expense_breakdown: { category: string; amount: number }[];
}

export interface SupplierOutstandingResult {
  supplier_id: string;
  supplier_name: string;
  contact_person: string;
  phone: string;
  outstanding_balance: number;
  credit_period_days: number;
  pending_pos_count: number;
  overdue_pos_count: number;
  nearest_due_date: string;
  escalation_status: 'NORMAL' | 'URGENT' | 'OVERDUE';
}

export interface ExecutiveReportResult {
  organization_id: string;
  organization_name: string;
  period_month: string;
  total_revenue: number;
  total_cogs: number;
  total_opex: number;
  net_profit: number;
  sales_orders_count: number;
  inventory_asset_valuation: number;
  dead_stock_capital_at_risk: number;
  low_stock_sku_count: number;
  unpaid_supplier_liability: number;
  top_selling_skus: { sku: string; name: string; revenue: number; units: number }[];
  strategic_ai_recommendations: string[];
}
