// 01-common-sense-check/src/checkout.ts
// A minimal order service. Plain TypeScript, no framework.

export interface CatalogEntry { name: string; price: number } // price in cents
export interface OrderItem { productId: string; quantity: number }
export interface OrderRequest { items: OrderItem[] }
export interface Order { id: string; items: OrderItem[]; total: number }

// Product catalog: the only source of prices.
export const catalog: Record<string, CatalogEntry> = {
  "sku-blue-tshirt": { name: "Blue T-shirt", price: 2000 },
  "sku-red-mug": { name: "Red mug", price: 900 },
};

const orders: Order[] = [];

export function createOrder(id: string, request: OrderRequest): Order {
  let total = 0;
  for (const item of request.items) {
    const entry = Object.prototype.hasOwnProperty.call(catalog, item.productId)
      ? catalog[item.productId]
      : undefined;
    if (!entry) {
      throw new Error(`Unknown product: ${item.productId}`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Quantity must be a positive integer: ${item.productId}`);
    }
    total += item.quantity * entry.price;
  }
  const order: Order = { id, items: request.items, total };
  orders.push(order);
  return order;
}

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}
