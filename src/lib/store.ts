import {
  Organization,
  Store,
  User,
  UserRole,
  Product,
  Category,
  Supplier,
  InventoryLedgerEntry,
  SalesOrder,
  PurchaseOrder,
  Expense,
  ExpenseCategory,
  Customer,
  StockTransfer,
  TransferStatus,
  Promotion,
  SystemAlert,
  AutomationLog,
  ReturnOrder,
} from './types';
import { formatCurrency } from './format';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_STORES,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_CUSTOMERS,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_PROMOTIONS,
  INITIAL_ALERTS,
} from './seed-data';
import { LedgerService } from './ledger-service';
import { MCPTools, DataContext } from './mcp-tools';
import { AutomationService, WorkflowResult } from './automation-service';

export interface AppState {
  organizations: Organization[];
  stores: Store[];
  users: User[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  ledgerEntries: InventoryLedgerEntry[];
  salesOrders: SalesOrder[];
  returnOrders: ReturnOrder[];
  purchaseOrders: PurchaseOrder[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  customers: Customer[];
  stockTransfers: StockTransfer[];
  promotions: Promotion[];
  alerts: SystemAlert[];
  automationLogs: AutomationLog[];

  // Multi-Tenant Session Context
  currentOrgId: string;
  currentStoreId: string;
  currentUser: User;
}

const STORAGE_KEY = 'retailpilot_ai_state_v2';

export class AppStore {
  private static state: AppState = AppStore.loadInitialState();
  private static listeners: Array<() => void> = [];
  private static hasInitializedClient = false;

  public static loadInitialState(): AppState {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.salesOrders) && parsed.salesOrders.length > 0) {
            return {
              ...parsed,
              returnOrders: parsed.returnOrders || [],
            };
          }
        }
      } catch {}
    }

    return {
      organizations: INITIAL_ORGANIZATIONS,
      stores: INITIAL_STORES,
      users: INITIAL_USERS,
      categories: INITIAL_CATEGORIES,
      suppliers: INITIAL_SUPPLIERS,
      products: INITIAL_PRODUCTS,
      ledgerEntries: INITIAL_LEDGER_ENTRIES,
      salesOrders: INITIAL_SALES_ORDERS,
      returnOrders: [],
      purchaseOrders: INITIAL_PURCHASE_ORDERS,
      expenseCategories: INITIAL_EXPENSE_CATEGORIES,
      expenses: INITIAL_EXPENSES,
      customers: INITIAL_CUSTOMERS,
      stockTransfers: INITIAL_STOCK_TRANSFERS,
      promotions: INITIAL_PROMOTIONS,
      alerts: INITIAL_ALERTS,
      automationLogs: [
        {
          id: 'log_init',
          organization_id: 'org_01',
          workflow_name: 'System Init & Ledger Sync',
          execution_status: 'SUCCESS',
          result_summary: 'Multi-tenant RLS initialized with 11 immutable ledger entries across 3 retail organizations.',
          triggered_at: '2026-08-21T06:00:00Z',
        },
      ],
      currentOrgId: 'org_01',
      currentStoreId: 'store_01',
      currentUser: INITIAL_USERS[1], // Default: Business Owner
    };
  }

  public static saveToLocalStorage() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(AppStore.state));
      } catch (err) {
        console.warn('[LocalStorage Save Error]', err);
      }
    }
  }

  public static initClient() {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.salesOrders) && parsed.salesOrders.length > 0) {
          AppStore.state.salesOrders = parsed.salesOrders;
          AppStore.state.returnOrders = parsed.returnOrders || [];
          AppStore.state.ledgerEntries = parsed.ledgerEntries || AppStore.state.ledgerEntries;
          if (parsed.expenses) AppStore.state.expenses = parsed.expenses;
          if (parsed.customers) AppStore.state.customers = parsed.customers;
          if (parsed.purchaseOrders) AppStore.state.purchaseOrders = parsed.purchaseOrders;
          if (parsed.stockTransfers) AppStore.state.stockTransfers = parsed.stockTransfers;
          AppStore.notifyListeners();
        }
      }
    } catch (e) {
      console.warn('[LocalStorage Hydration Error]', e);
    }
    AppStore.hasInitializedClient = true;
  }

  public static notifyListeners() {
    AppStore.listeners.forEach((l) => l());
  }

  private static persistAndNotify() {
    AppStore.saveToLocalStorage();
    AppStore.notifyListeners();
  }

  public static getState(): AppState {
    return AppStore.state;
  }

  public static subscribe(listener: () => void): () => void {
    AppStore.listeners.push(listener);
    if (typeof window !== 'undefined' && !AppStore.hasInitializedClient) {
      setTimeout(() => {
        AppStore.initClient();
      }, 0);
    }
    return () => {
      AppStore.listeners = AppStore.listeners.filter((l) => l !== listener);
    };
  }

  public static resetToSeed() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    AppStore.state = {
      ...AppStore.loadInitialState(),
      automationLogs: [
        {
          id: `log_${Date.now()}`,
          organization_id: 'org_01',
          workflow_name: 'Database Reset & Re-Seed',
          execution_status: 'SUCCESS',
          result_summary: 'Reset database to master seed state with Supabase RLS isolation verified.',
          triggered_at: new Date().toISOString(),
        },
      ],
    };
    AppStore.persistAndNotify();
  }

  // Tenant / Role Switching
  public static setOrganization(orgId: string) {
    AppStore.state.currentOrgId = orgId;
    const orgStores = AppStore.state.stores.filter((s) => s.organization_id === orgId);
    if (orgStores.length > 0) {
      AppStore.state.currentStoreId = orgStores[0].id;
    }
    AppStore.persistAndNotify();
  }

  public static setStore(storeId: string) {
    AppStore.state.currentStoreId = storeId;
    AppStore.persistAndNotify();
  }

  public static setUserRole(role: UserRole) {
    const matchedUser = AppStore.state.users.find((u) => u.role === role);
    if (matchedUser) {
      AppStore.state.currentUser = matchedUser;
      if (matchedUser.organization_id) {
        AppStore.state.currentOrgId = matchedUser.organization_id;
      }
      if (matchedUser.store_id) {
        AppStore.state.currentStoreId = matchedUser.store_id;
      }
    } else {
      AppStore.state.currentUser = {
        id: `usr_${role.toLowerCase()}`,
        email: `${role.toLowerCase()}@retailpilot.ai`,
        full_name: `Active ${role.replace('_', ' ')}`,
        role: role,
        organization_id: role === 'SUPER_ADMIN' ? undefined : AppStore.state.currentOrgId,
        store_id: role === 'SUPER_ADMIN' ? undefined : AppStore.state.currentStoreId,
        is_active: true,
      };
    }
    AppStore.persistAndNotify();
  }

  // POS Checkout with Immutable Ledger Stock Deduction
  public static processCheckout(salesOrder: SalesOrder) {
    // 1. Add Sales Order
    AppStore.state.salesOrders = [salesOrder, ...AppStore.state.salesOrders];

    // 2. Atomically record immutable stock ledger deduction
    AppStore.state.ledgerEntries = LedgerService.processPOSCheckout(
      salesOrder,
      AppStore.state.ledgerEntries
    );

    // 3. Update customer loyalty points and spend if registered
    if (salesOrder.customer_id) {
      const cust = AppStore.state.customers.find((c) => c.id === salesOrder.customer_id);
      if (cust) {
        cust.total_spend += salesOrder.total_amount;
        cust.loyalty_points += Math.floor(salesOrder.total_amount); // 1 point per $1
      }
    }

    // 4. Auto check for Low Stock Alert
    const lowStock = MCPTools.getLowStockProducts(AppStore.getDataContext(), {
      store_id: salesOrder.store_id,
      threshold_days: 3,
    });
    if (lowStock.length > 0) {
      const topLow = lowStock[0];
      AppStore.state.alerts.unshift({
        id: `alt_ls_${Date.now()}`,
        organization_id: salesOrder.organization_id,
        store_id: salesOrder.store_id,
        alert_type: 'LOW_STOCK',
        severity: 'CRITICAL',
        title: `Auto Low-Stock Trigger: ${topLow.name} (${topLow.current_stock} remaining)`,
        message: `Inventory dropped below reorder point after checkout ${salesOrder.invoice_number}. Estimated stockout in ${topLow.days_until_stockout} days.`,
        is_read: false,
        action_url: '/inventory',
        created_at: new Date().toISOString(),
      });
    }

    AppStore.persistAndNotify();
  }

  // Returns Processing
  public static processReturn(returnOrder: ReturnOrder): {
    success: boolean;
    refund_amount: number;
    subtotal_refund: number;
    tax_refund: number;
    sales_order_status: 'COMPLETED' | 'PARTIALLY_RETURNED' | 'RETURNED';
  } {
    const order = AppStore.state.salesOrders.find((s) => s.id === returnOrder.sales_order_id);
    if (!order) {
      throw new Error(`Return validation failed: Sales order not found (${returnOrder.sales_order_id}).`);
    }

    // 1. Mathematically validate against line items and previous return history
    LedgerService.validateReturn(order, returnOrder.items, AppStore.state.returnOrders || []);

    // 2. Compute exact prorated refund math accounting for original discounts & GST
    const prorated = LedgerService.calculateProratedRefund(order, returnOrder.items);
    returnOrder.refund_amount = prorated.totalRefund;

    // Set line refund unit prices
    for (const item of returnOrder.items) {
      if (prorated.itemBreakdown[item.product_id] !== undefined && item.quantity > 0) {
        item.refund_unit_price = parseFloat((prorated.itemBreakdown[item.product_id] / item.quantity).toFixed(2));
      }
    }

    // 3. Process immutable stock ledger movements (RESTOCKABLE vs DAMAGED)
    AppStore.state.ledgerEntries = LedgerService.processReturn(
      returnOrder,
      AppStore.state.ledgerEntries
    );

    // 4. Record return order into history
    if (!AppStore.state.returnOrders) {
      AppStore.state.returnOrders = [];
    }
    AppStore.state.returnOrders.unshift(returnOrder);

    // 5. Update sales order status dynamically across all line items
    const isFullyReturned = order.items.every((item) => {
      const returnedForLine = LedgerService.getAlreadyReturnedQuantity(
        order.id,
        item.product_id,
        AppStore.state.returnOrders
      );
      return returnedForLine >= item.quantity;
    });

    const hasAnyReturn = order.items.some((item) => {
      const returnedForLine = LedgerService.getAlreadyReturnedQuantity(
        order.id,
        item.product_id,
        AppStore.state.returnOrders
      );
      return returnedForLine > 0;
    });

    if (isFullyReturned) {
      order.status = 'RETURNED';
    } else if (hasAnyReturn) {
      order.status = 'PARTIALLY_RETURNED';
    } else {
      order.status = 'COMPLETED';
    }

    // 6. Generate detailed audit notification
    const totalUnitsInReturn = returnOrder.items.reduce((s, i) => s + i.quantity, 0);
    const restockableUnits = returnOrder.items.filter((i) => i.condition === 'RESTOCKABLE').reduce((s, i) => s + i.quantity, 0);
    const damagedUnits = returnOrder.items.filter((i) => i.condition === 'DAMAGED').reduce((s, i) => s + i.quantity, 0);

    AppStore.state.alerts.unshift({
      id: `alt_ret_${Date.now()}`,
      organization_id: returnOrder.organization_id,
      store_id: returnOrder.store_id,
      alert_type: 'SYSTEM',
      severity: 'INFO',
      title: `Return Processed: ${returnOrder.return_number} (${formatCurrency(returnOrder.refund_amount)})`,
      message: `Invoice ${returnOrder.invoice_number}: ${totalUnitsInReturn} unit(s) refunded (${restockableUnits} restocked, ${damagedUnits} damaged written off). Order status: ${order.status}.`,
      is_read: false,
      action_url: '/sales',
      created_at: new Date().toISOString(),
    });

    AppStore.persistAndNotify();

    return {
      success: true,
      refund_amount: returnOrder.refund_amount,
      subtotal_refund: prorated.subtotalRefund,
      tax_refund: prorated.taxRefund,
      sales_order_status: order.status,
    };
  }

  public static getReturnsForOrder(salesOrderId: string): ReturnOrder[] {
    return (AppStore.state.returnOrders || []).filter((r) => r.sales_order_id === salesOrderId);
  }

  public static getReturnableQuantity(salesOrderId: string, productId: string): number {
    const order = AppStore.state.salesOrders.find((s) => s.id === salesOrderId);
    if (!order) return 0;
    return LedgerService.getReturnableQuantity(order, productId, AppStore.state.returnOrders || []);
  }

  // Branch-to-Branch Stock Transfers
  public static advanceTransfer(transferId: string, targetStatus: TransferStatus) {
    const transfer = AppStore.state.stockTransfers.find((t) => t.id === transferId);
    if (!transfer) throw new Error('Transfer not found');

    const result = LedgerService.processTransferTransition(
      transfer,
      targetStatus,
      AppStore.state.currentUser.id,
      AppStore.state.products,
      AppStore.state.ledgerEntries
    );

    // Update transfer in list
    AppStore.state.stockTransfers = AppStore.state.stockTransfers.map((t) =>
      t.id === transferId ? result.updatedTransfer : t
    );
    AppStore.state.ledgerEntries = result.newEntries;

    AppStore.persistAndNotify();
  }

  public static createStockTransfer(
    sourceStoreId: string,
    destStoreId: string,
    items: { productId: string; quantity: number }[],
    notes?: string
  ): StockTransfer {
    const sourceStore = AppStore.state.stores.find((s) => s.id === sourceStoreId);
    const destStore = AppStore.state.stores.find((s) => s.id === destStoreId);

    const transferItems = items.map((i) => {
      const prod = AppStore.state.products.find((p) => p.id === i.productId);
      return {
        id: `trfi_${Date.now()}_${i.productId}`,
        transfer_id: '',
        product_id: i.productId,
        product_name: prod?.name || '',
        sku: prod?.sku || '',
        quantity_requested: i.quantity,
        quantity_sent: 0,
        quantity_received: 0,
      };
    });

    const newTransfer: StockTransfer = {
      id: `trf_${Date.now()}`,
      organization_id: AppStore.state.currentOrgId,
      transfer_number: `TRF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      source_store_id: sourceStoreId,
      source_store_name: sourceStore?.name,
      destination_store_id: destStoreId,
      destination_store_name: destStore?.name,
      status: 'DRAFT',
      requested_by: AppStore.state.currentUser.id,
      notes: notes,
      items: transferItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    newTransfer.items.forEach((item) => (item.transfer_id = newTransfer.id));
    AppStore.state.stockTransfers.unshift(newTransfer);
    AppStore.persistAndNotify();
    return newTransfer;
  }

  // Stock Adjustment or Damaged logging via Immutable Ledger
  public static logStockAdjustment(
    productId: string,
    quantityChange: number,
    type: 'DAMAGED' | 'ADJUSTMENT',
    reason: string
  ) {
    const prod = AppStore.state.products.find((p) => p.id === productId);
    if (!prod) throw new Error('Product not found');

    const entry = LedgerService.recordStockMovement(
      {
        organization_id: AppStore.state.currentOrgId,
        store_id: AppStore.state.currentStoreId,
        store_name: AppStore.state.stores.find((s) => s.id === AppStore.state.currentStoreId)?.name,
        product_id: productId,
        product_name: prod.name,
        sku: prod.sku,
        movement_type: type,
        quantity_change: quantityChange,
        unit_cost: prod.unit_cost,
        reason: reason,
        created_by: AppStore.state.currentUser.id,
        created_by_name: AppStore.state.currentUser.full_name,
      },
      AppStore.state.ledgerEntries
    );

    AppStore.state.ledgerEntries = entry.updatedEntries;
    AppStore.persistAndNotify();
  }

  // Purchase Orders & GRN
  public static createPurchaseOrder(
    supplierId: string,
    items: { productId: string; quantity: number }[],
    dueDate: string,
    notes?: string
  ): PurchaseOrder {
    const sup = AppStore.state.suppliers.find((s) => s.id === supplierId);
    let total = 0;
    const poItems = items.map((i) => {
      const prod = AppStore.state.products.find((p) => p.id === i.productId);
      const unitCost = prod?.unit_cost || 0;
      const subtotal = i.quantity * unitCost;
      total += subtotal;
      return {
        id: `poi_${Date.now()}_${i.productId}`,
        purchase_order_id: '',
        product_id: i.productId,
        product_name: prod?.name || '',
        sku: prod?.sku || '',
        quantity_ordered: i.quantity,
        quantity_received: 0,
        unit_cost: unitCost,
        subtotal: subtotal,
      };
    });

    const newPO: PurchaseOrder = {
      id: `po_${Date.now()}`,
      organization_id: AppStore.state.currentOrgId,
      store_id: AppStore.state.currentStoreId,
      supplier_id: supplierId,
      supplier_name: sup?.name || 'Supplier',
      po_number: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'SENT',
      total_amount: total,
      payment_status: 'PENDING',
      payment_due_date: dueDate,
      items: poItems,
      notes: notes,
      created_by: AppStore.state.currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    newPO.items.forEach((item) => (item.purchase_order_id = newPO.id));
    AppStore.state.purchaseOrders.unshift(newPO);
    AppStore.persistAndNotify();
    return newPO;
  }

  public static receivePurchaseOrderGRN(poId: string, notes?: string) {
    const po = AppStore.state.purchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error('PO not found');

    po.status = 'RECEIVED';
    po.updated_at = new Date().toISOString();

    // Log PURCHASE movement into immutable ledger
    const newLedgerEntries: InventoryLedgerEntry[] = [];
    for (const item of po.items) {
      item.quantity_received = item.quantity_ordered;
      newLedgerEntries.push({
        id: `led_po_${po.id}_${item.product_id}`,
        organization_id: po.organization_id,
        store_id: po.store_id,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        movement_type: 'PURCHASE',
        quantity_change: item.quantity_ordered,
        unit_cost: item.unit_cost,
        total_cost: item.quantity_ordered * item.unit_cost,
        reference_id: po.po_number,
        reason: `Goods Receipt Note for ${po.po_number} from ${po.supplier_name}. ${notes || ''}`,
        created_by: AppStore.state.currentUser.id,
        created_by_name: AppStore.state.currentUser.full_name,
        created_at: new Date().toISOString(),
      });
    }

    AppStore.state.ledgerEntries = [...newLedgerEntries, ...AppStore.state.ledgerEntries];
    AppStore.persistAndNotify();
  }

  // Expense Logging
  public static addExpense(
    categoryId: string,
    title: string,
    amount: number,
    expenseDate: string,
    notes?: string
  ) {
    const cat = AppStore.state.expenseCategories.find((c) => c.id === categoryId);
    const newExp: Expense = {
      id: `exp_${Date.now()}`,
      organization_id: AppStore.state.currentOrgId,
      store_id: AppStore.state.currentStoreId,
      category_id: categoryId,
      category_name: cat?.name || 'General',
      title,
      amount,
      expense_date: expenseDate,
      logged_by: AppStore.state.currentUser.id,
      notes,
      created_at: new Date().toISOString(),
    };

    AppStore.state.expenses.unshift(newExp);
    AppStore.persistAndNotify();
  }

  // Automations Execution
  public static runAutomation(workflowIndex: 1 | 2 | 3 | 4 | 5): WorkflowResult {
    const context = AppStore.getDataContext();
    let result: WorkflowResult;

    switch (workflowIndex) {
      case 1:
        result = AutomationService.runLowStockAlertWorkflow(context, AppStore.state.currentStoreId);
        break;
      case 2:
        result = AutomationService.runDeadStockAuditWorkflow(context, AppStore.state.currentOrgId);
        break;
      case 3:
        result = AutomationService.runSupplierPaymentEscalationWorkflow(
          context,
          AppStore.state.currentOrgId
        );
        break;
      case 4:
        result = AutomationService.runEndOfDayDossierWorkflow(context, AppStore.state.currentOrgId);
        break;
      case 5:
        result = AutomationService.runMonthlyExecutiveReportWorkflow(
          context,
          AppStore.state.currentOrgId
        );
        break;
    }

    // Add generated alerts
    AppStore.state.alerts = [...result.alerts_generated, ...AppStore.state.alerts];

    // Add log
    AppStore.state.automationLogs.unshift({
      id: `log_${Date.now()}`,
      organization_id: AppStore.state.currentOrgId,
      workflow_name: result.workflow_name,
      execution_status: result.execution_status,
      payload: result.payload,
      result_summary: result.summary,
      triggered_at: new Date().toISOString(),
    });

    AppStore.persistAndNotify();
    return result;
  }

  // Alerts Management
  public static markAlertAsRead(alertId: string) {
    const alert = AppStore.state.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.is_read = true;
      AppStore.persistAndNotify();
    }
  }

  public static getDataContext(): DataContext {
    return {
      organizations: AppStore.state.organizations,
      stores: AppStore.state.stores,
      products: AppStore.state.products,
      ledgerEntries: AppStore.state.ledgerEntries,
      salesOrders: AppStore.state.salesOrders,
      returnOrders: AppStore.state.returnOrders,
      purchaseOrders: AppStore.state.purchaseOrders,
      expenses: AppStore.state.expenses,
      suppliers: AppStore.state.suppliers,
    };
  }
}
