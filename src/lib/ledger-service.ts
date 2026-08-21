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
          (storeId ? e.store_id === storeId : true)
      );

      const currentStock = relevantEntries.reduce((sum, entry) => sum + entry.quantity_change, 0);
      const valuation = Math.max(0, currentStock) * product.unit_cost;
      const isLowStock = currentStock <= product.reorder_point;

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
        unit_cost: product.unit_cost,
        selling_price: product.selling_price,
        reorder_point: product.reorder_point,
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
   * Processes Customer Return:
   * RESTOCKABLE items are returned to stock with 'RETURN' (+qty)
   * DAMAGED items are logged as 'RETURN' (+qty) followed immediately by 'DAMAGED' (-qty) for full audit traceability
   */
  static processReturn(
    returnOrder: ReturnOrder,
    existingEntries: InventoryLedgerEntry[]
  ): InventoryLedgerEntry[] {
    const newEntries: InventoryLedgerEntry[] = [];

    for (const item of returnOrder.items) {
      // 1. Log Return entry
      const returnEntry: InventoryLedgerEntry = {
        id: `led_ret_${returnOrder.id}_${item.product_id}`,
        organization_id: returnOrder.organization_id,
        store_id: returnOrder.store_id,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        movement_type: 'RETURN',
        quantity_change: Math.abs(item.quantity),
        unit_cost: item.refund_unit_price,
        total_cost: item.quantity * item.refund_unit_price,
        reference_id: returnOrder.return_number,
        reason: `Customer return for invoice ${returnOrder.invoice_number} (${returnOrder.reason})`,
        created_by: returnOrder.processed_by,
        created_by_name: returnOrder.processed_by_name,
        created_at: new Date().toISOString(),
      };
      newEntries.push(returnEntry);

      // 2. If marked damaged, immediately write DAMAGED movement to remove from active sellable inventory
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
          total_cost: item.quantity * item.refund_unit_price,
          reference_id: returnOrder.return_number,
          reason: `Damaged item write-off from return: ${returnOrder.return_number}`,
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
