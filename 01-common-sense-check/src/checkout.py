# 01-common-sense-check/src/checkout.py
# A minimal order service. Plain Python, no framework.
from dataclasses import dataclass

@dataclass
class CatalogEntry:
    name: str
    price: int  # price in cents

@dataclass
class OrderItem:
    product_id: str
    quantity: int

@dataclass
class OrderRequest:
    items: list

@dataclass
class Order:
    id: str
    items: list
    total: int

# Product catalog: the only source of prices.
CATALOG = {
    "sku-blue-tshirt": CatalogEntry("Blue T-shirt", 2000),
    "sku-red-mug": CatalogEntry("Red mug", 900),
}

_orders = []

def create_order(order_id, request):
    total = 0
    for item in request.items:
        entry = CATALOG.get(item.product_id)
        if entry is None:
            raise ValueError(f"Unknown product: {item.product_id}")
        if item.quantity <= 0:
            raise ValueError(f"Quantity must be positive: {item.product_id}")
        total += item.quantity * entry.price
    order = Order(order_id, request.items, total)
    _orders.append(order)
    return order

def get_order(order_id):
    for order in _orders:
        if order.id == order_id:
            return order
    return None
