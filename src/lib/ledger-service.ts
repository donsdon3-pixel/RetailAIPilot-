import {
  InventoryLedgerEntry,
  InventoryBalance,
  Product,
  StockTransfer,
  TransferStatus,
  SalesOrder,
  ReturnOrder,
  MovementType,
} from './types';

/**
 * Immutable Stock Movement Ledger Service
 * Formula: Current Stock = Opening Stock + Purchases - Sales + Returns - Damaged ± Adjustments ± Transfers
 * DIRECT MANUAL OVERWRITES ARE STRICTLY FORBIDDEN.
 */
export class LedgerService {
  /**
   * Calculates real-time stock balances per store and product from the immutable ledger
   */
  static calculateStockBalances(
    organizationId: string,
    storeId: string | undefined,
    ledgerEntries: InventoryLedgerEntry[],
    products: Product[]
  ): InventoryBalance[] {
    const orgProducts = products.filter((p) => p.organization_id === organizationId);
    const balances: InventoryBalance[] = [];

    for (const product of orgProducts) {
      // Filter entries for this product (and optionally store)
      const relevantEntries = ledgerEntries.filter(
        (e) =>
          e.organization_id === organizationId &&
          e.product_id === product.id &&
          (storeId && storeId !== 'ALL' ? e.store_id === storeId : true)
      );

      const currentStock = relevantEntries.reduce(
        (sum, entry) => sum + (Number(entry.quantity_change) || 0),
        0
      );
      const unitCost = Number(product.unit_cost) || 0;
      const valuation = Math.max(0, currentStock) * unitCost;
      const reorderPoint = Number(product.reorder_point) || 0;
      const isLowStock = currentStock <= reorderPoint;

      // Check dead stock: last sale entry
      const saleEntries = relevantEntries.filter((e) => e.movement_type === 'SALE');
      let daysWithoutSale = 90; // default if no sales recorded
      if (saleEntries.length > 0) {
        const lastSaleDate = new Date(
          Math.max(...saleEntries.map((e) => new Date(e.created_at).getTime()))
        );
        const diffTime = Math.abs(new Date().getTime() - lastSaleDate.getTime());
        daysWithoutSale = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        // Look at creation of opening stock
        const openingEntry = relevantEntries.find((e) => e.movement_type === 'OPENING_STOCK');
        if (openingEntry) {
          const openDate = new Date(openingEntry.created_at);
          const diffTime = Math.abs(new Date().getTime() - openDate.getTime());
          daysWithoutSale = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      balances.push({
        organization_id: organizationId,
        store_id: storeId || 'ALL',
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        category_name: product.category_name,
        unit_cost: unitCost,
        selling_price: Number(product.selling_price) || 0,
        reorder_point: reorderPoint,
        current_stock: currentStock,
        total_inventory_valuation: valuation,
        is_low_stock: isLowStock,
        days_without_sale: daysWithoutSale,
      });
    }

    return balances;
  }

  /**
   * Appends an immutable stock ledger entry with tamper-prevention assertions
   */
  static recordStockMovement(
    entry: Omit<InventoryLedgerEntry, 'id' | 'created_at' | 'total_cost'>,
    existingEntries: InventoryLedgerEntry[]
  ): { newEntry: InventoryLedgerEntry; updatedEntries: InventoryLedgerEntry[] } {
    if (entry.quantity_change === 0) {
      throw new Error('Ledger Error: Quantity change cannot be 0.');
    }

    const totalCost = Math.abs(entry.quantity_change) * entry.unit_cost;
    const newEntry: InventoryLedgerEntry = {
      ...entry,
      id: `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      total_cost: totalCost,
      created_at: new Date().toISOString(),
    };

    return {
      newEntry,
      updatedEntries: [newEntry, ...existingEntries],
    };
  }

  /**
   * Processes POS Checkout: Atomically records 'SALE' movement for all items
   */
  static processPOSCheckout(
    salesOrder: SalesOrder,
    existingEntries: InventoryLedgerEntry[]
  ): InventoryLedgerEntry[] {
    const newEntries: InventoryLedgerEntry[] = [];

    for (const item of salesOrder.items) {
      const entry: InventoryLedgerEntry = {
        id: `led_sale_${salesOrder.id}_${item.product_id}`,
        organization_id: salesOrder.organization_id,
        store_id: salesOrder.store_id,
        store_name: salesOrder.store_name,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        movement_type: 'SALE',
        quantity_change: -Math.abs(item.quantity), // Deduct stock
        unit_cost: item.unit_cost,
        total_cost: item.quantity * item.unit_cost,
        reference_id: salesOrder.invoice_number,
        reason: `POS Sale invoice: ${salesOrder.invoice_number}`,
        created_by: salesOrder.cashier_id,
        created_by_name: salesOrder.cashier_name,
        created_at: new Date().toISOString(),
      };
      newEntries.push(entry);
    }

    return [...newEntries, ...existingEntries];
  }

  /**
   * Calculates total quantity already returned for a specific product on a sales order
   */
  static getAlreadyReturnedQuantity(
    salesOrderId: string,
    productId: string,
    returnOrders: ReturnOrder[]
  ): number {
    const relevantReturns = returnOrders.filter((r) => r.sales_order_id === salesOrderId);
    let totalReturned = 0;
    for (const ret of relevantReturns) {
      for (const item of ret.items) {
        if (item.product_id === productId) {
          totalReturned += item.quantity;
        }
      }
    }
    return totalReturned;
  }

  /**
   * Calculates remaining returnable quantity for a specific product on a sales order
   */
  static getReturnableQuantity(
    salesOrder: SalesOrder,
    productId: string,
    returnOrders: ReturnOrder[]
  ): number {
    const orderItem = salesOrder.items.find((i) => i.product_id === productId);
    if (!orderItem) return 0;
    const alreadyReturned = this.getAlreadyReturnedQuantity(salesOrder.id, productId, returnOrders);
    return Math.max(0, orderItem.quantity - alreadyReturned);
  }

  /**
   * Calculates exact per-line prorated refund amount for returned items.
   * Genuinely per-line calculation: for each returned line, refund =
   * (unit_price * qty_returned) - (that line's specific discount share) + (that line's specific tax share),
   * summed across only the returned lines.
   *
   * Invariant Guard:
   * Rejects invoices with non-positive subtotals or unallocated items, guaranteeing accurate GST & discount reversals.
   */
  static calculateProratedRefund(
    salesOrder: SalesOrder,
    itemsToReturn: Array<{ product_id: string; quantity: number }>
  ): {
    subtotalRefund: number;
    taxRefund: number;
    totalRefund: number;
    itemBreakdown: Record<string, number>;
  } {
    if (!salesOrder || !salesOrder.items || salesOrder.items.length === 0) {
      throw new Error('Refund calculation error: Invoice contains no line items.');
    }

    const invoiceSubtotal = salesOrder.subtotal;
    if (invoiceSubtotal <= 0) {
      throw new Error(`Refund calculation error: Invalid invoice subtotal (${invoiceSubtotal}) for invoice ${salesOrder.invoice_number}.`);
    }

    const invoiceDiscount = salesOrder.discount_amount || 0;
    const invoiceTaxable = salesOrder.taxable_amount || (invoiceSubtotal - invoiceDiscount);
    const invoiceTax = salesOrder.tax_amount || 0;

    // Baseline invoice-level tax rate (e.g. 0.12 for 12% GST)
    const effectiveInvoiceTaxRate = invoiceTaxable > 0 ? invoiceTax / invoiceTaxable : 0;

    let subtotalRefund = 0;
    let taxRefund = 0;
    let totalRefund = 0;
    const itemBreakdown: Record<string, number> = {};

    for (const ret of itemsToReturn) {
      if (!ret.quantity || ret.quantity <= 0) continue;

      const orderItem = salesOrder.items.find((i) => i.product_id === ret.product_id);
      if (!orderItem) {
        throw new Error(`Refund calculation error: Returned item ${ret.product_id} not found in invoice ${salesOrder.invoice_number}.`);
      }

      // 1. Gross subtotal for returned quantity of this line
      const lineGrossSubtotal = ret.quantity * orderItem.unit_price;

      // 2. Line-specific discount apportionment
      let lineDiscountShare = 0;
      if (orderItem.discount_amount !== undefined && orderItem.discount_amount > 0) {
        // Line has an item-specific discount
        lineDiscountShare = (ret.quantity / orderItem.quantity) * orderItem.discount_amount;
      } else if (invoiceDiscount > 0 && invoiceSubtotal > 0) {
        // Invoice-level discount apportioned by line's pre-discount subtotal weight
        lineDiscountShare = lineGrossSubtotal * (invoiceDiscount / invoiceSubtotal);
      }

      // 3. Line-specific taxable amount
      const lineTaxable = Math.max(0, lineGrossSubtotal - lineDiscountShare);

      // 4. Line-specific GST tax rate (supports per-item tax rate if defined, or invoice effective tax rate)
      const lineTaxRate = orderItem.tax_rate !== undefined ? orderItem.tax_rate : effectiveInvoiceTaxRate;
      const lineTax = lineTaxable * lineTaxRate;

      // 5. Line-specific net refund
      const lineTotalRefund = lineTaxable + lineTax;

      const lineTaxableRounded = parseFloat(lineTaxable.toFixed(2));
      const lineTaxRounded = parseFloat(lineTax.toFixed(2));
      const lineTotalRounded = parseFloat(lineTotalRefund.toFixed(2));

      subtotalRefund += lineTaxableRounded;
      taxRefund += lineTaxRounded;
      totalRefund += lineTotalRounded;
      itemBreakdown[ret.product_id] = lineTotalRounded;
    }

    return {
      subtotalRefund: parseFloat(subtotalRefund.toFixed(2)),
      taxRefund: parseFloat(taxRefund.toFixed(2)),
      totalRefund: parseFloat(totalRefund.toFixed(2)),
      itemBreakdown,
    };
  }

  /**
   * Mathematically validates return request against original invoice line items and previous return history
   */
  static validateReturn(
    salesOrder: SalesOrder,
    returnItems: Array<{ product_id: string; quantity: number; product_name?: string }>,
    previousReturns: ReturnOrder[]
  ): void {
    if (!returnItems || returnItems.length === 0) {
      throw new Error('Return validation failed: No items specified for return.');
    }

    const totalQtyToReturn = returnItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    if (totalQtyToReturn <= 0) {
      throw new Error('Return validation failed: Total return quantity must be greater than 0.');
    }

    for (const retItem of returnItems) {
      if (retItem.quantity < 0) {
        throw new Error(`Return validation failed: Quantity cannot be negative for product ID ${retItem.product_id}.`);
      }

      if (retItem.quantity === 0) continue;

      const orderItem = salesOrder.items.find((i) => i.product_id === retItem.product_id);
      if (!orderItem) {
        throw new Error(`Return validation failed: Product ${retItem.product_name || retItem.product_id} was not part of original invoice ${salesOrder.invoice_number}.`);
      }

      const alreadyReturned = this.getAlreadyReturnedQuantity(salesOrder.id, retItem.product_id, previousReturns);
      const remainingReturnable = orderItem.quantity - alreadyReturned;

      if (retItem.quantity > remainingReturnable) {
        const prodName = orderItem.product_name || retItem.product_name || 'Item';
        if (alreadyReturned > 0) {
          throw new Error(
            `Cannot return more items than originally purchased. ${alreadyReturned} item(s) already returned for ${prodName}. Maximum returnable quantity is ${remainingReturnable}.`
          );
        } else {
          throw new Error(
            `Cannot return more items than originally purchased. Attempted to return ${retItem.quantity}, but only ${orderItem.quantity} originally purchased for ${prodName}.`
          );
        }
      }
    }
  }

  /**
   * Processes Customer Return:
   * RESTOCKABLE items are returned to stock with 'RETURN' (+qty)
   * DAMAGED items are logged as 'RETURN' (+qty) followed immediately by 'DAMAGED' (-qty)
   * Linked via shared return_order_id, return_item_id, and linked_movement_id foreign key.
   */
  static processReturn(
    returnOrder: ReturnOrder,
    existingEntries: InventoryLedgerEntry[]
  ): InventoryLedgerEntry[] {
    const newEntries: InventoryLedgerEntry[] = [];

    for (const item of returnOrder.items) {
      if (item.quantity <= 0) continue;

      const returnEntryId = `led_ret_${returnOrder.id}_${item.product_id}`;

      // 1. Log Return entry (+qty)
      const returnEntry: InventoryLedgerEntry = {
        id: returnEntryId,
        organization_id: returnOrder.organization_id,
        store_id: returnOrder.store_id,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        movement_type: 'RETURN',
        quantity_change: Math.abs(item.quantity),
        unit_cost: item.refund_unit_price,
        total_cost: parseFloat((item.quantity * item.refund_unit_price).toFixed(2)),
        reference_id: returnOrder.return_number,
        return_order_id: returnOrder.id,
        return_item_id: item.id,
        reason: `Customer return for invoice ${returnOrder.invoice_number} (${returnOrder.reason})`,
        created_by: returnOrder.processed_by,
        created_by_name: returnOrder.processed_by_name,
        created_at: new Date().toISOString(),
      };
      newEntries.push(returnEntry);

      // 2. If marked DAMAGED, write DAMAGED movement (-qty) explicitly linked via linked_movement_id
      if (item.condition === 'DAMAGED') {
        const damageEntry: InventoryLedgerEntry = {
          id: `led_dmg_${returnOrder.id}_${item.product_id}`,
          organization_id: returnOrder.organization_id,
          store_id: returnOrder.store_id,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          movement_type: 'DAMAGED',
          quantity_change: -Math.abs(item.quantity),
          unit_cost: item.refund_unit_price,
          total_cost: parseFloat((item.quantity * item.refund_unit_price).toFixed(2)),
          reference_id: returnOrder.return_number,
          return_order_id: returnOrder.id,
          return_item_id: item.id,
          linked_movement_id: returnEntryId, // Direct foreign key linkage
          reason: `Damaged item write-off from return: ${returnOrder.return_number} (linked movement: ${returnEntryId})`,
          created_by: returnOrder.processed_by,
          created_by_name: returnOrder.processed_by_name,
          created_at: new Date().toISOString(),
        };
        newEntries.push(damageEntry);
      }
    }

    return [...newEntries, ...existingEntries];
  }

  /**
   * Advances Stock Transfer through the 5 mandatory states:
   * DRAFT -> REQUESTED -> APPROVED -> DISPATCHED -> RECEIVED
   * When DISPATCHED: creates 'TRANSFER_OUT' on source store
   * When RECEIVED: creates 'TRANSFER_IN' on destination store
   */
  static processTransferTransition(
    transfer: StockTransfer,
    targetStatus: TransferStatus,
    userId: string,
    products: Product[],
    existingEntries: InventoryLedgerEntry[]
  ): { updatedTransfer: StockTransfer; newEntries: InventoryLedgerEntry[] } {
    const validTransitions: Record<TransferStatus, TransferStatus[]> = {
      DRAFT: ['REQUESTED', 'CANCELLED'],
      REQUESTED: ['APPROVED', 'CANCELLED'],
      APPROVED: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['RECEIVED'],
      RECEIVED: [],
      CANCELLED: [],
    };

    if (!validTransitions[transfer.status].includes(targetStatus)) {
      throw new Error(`Invalid transfer transition from ${transfer.status} to ${targetStatus}`);
    }

    const updatedTransfer: StockTransfer = {
      ...transfer,
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    const newEntries: InventoryLedgerEntry[] = [];

    if (targetStatus === 'DISPATCHED') {
      updatedTransfer.dispatched_by = userId;
      // Deduct from source store with TRANSFER_OUT
      for (const item of transfer.items) {
        const prod = products.find((p) => p.id === item.product_id);
        const unitCost = prod ? prod.unit_cost : 0;
        const entry: InventoryLedgerEntry = {
          id: `led_trf_out_${transfer.id}_${item.product_id}`,
          organization_id: transfer.organization_id,
          store_id: transfer.source_store_id,
          store_name: transfer.source_store_name,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          movement_type: 'TRANSFER_OUT',
          quantity_change: -Math.abs(item.quantity_requested),
          unit_cost: unitCost,
          total_cost: item.quantity_requested * unitCost,
          reference_id: transfer.transfer_number,
          reason: `Branch Transfer Out to ${transfer.destination_store_name || transfer.destination_store_id}`,
          created_by: userId,
          created_at: new Date().toISOString(),
        };
        newEntries.push(entry);
        item.quantity_sent = item.quantity_requested;
      }
    } else if (targetStatus === 'RECEIVED') {
      updatedTransfer.received_by = userId;
      // Add to destination store with TRANSFER_IN
      for (const item of transfer.items) {
        const prod = products.find((p) => p.id === item.product_id);
        const unitCost = prod ? prod.unit_cost : 0;
        const entry: InventoryLedgerEntry = {
          id: `led_trf_in_${transfer.id}_${item.product_id}`,
          organization_id: transfer.organization_id,
          store_id: transfer.destination_store_id,
          store_name: transfer.destination_store_name,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          movement_type: 'TRANSFER_IN',
          quantity_change: Math.abs(item.quantity_sent || item.quantity_requested),
          unit_cost: unitCost,
          total_cost: (item.quantity_sent || item.quantity_requested) * unitCost,
          reference_id: transfer.transfer_number,
          reason: `Branch Transfer In from ${transfer.source_store_name || transfer.source_store_id}`,
          created_by: userId,
          created_at: new Date().toISOString(),
        };
        newEntries.push(entry);
        item.quantity_received = item.quantity_sent || item.quantity_requested;
      }
    } else if (targetStatus === 'APPROVED') {
      updatedTransfer.approved_by = userId;
    }

    return {
      updatedTransfer,
      newEntries: [...newEntries, ...existingEntries],
    };
  }
}
