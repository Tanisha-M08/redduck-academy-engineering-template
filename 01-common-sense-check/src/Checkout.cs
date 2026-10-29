// 01-common-sense-check/src/Checkout.cs
// A minimal order service. Plain C#, no framework.
using System;
using System.Collections.Generic;

public record CatalogEntry(string Name, int Price); // price in cents
public record OrderItem(string ProductId, int Quantity);
public record OrderRequest(List<OrderItem> Items);
public record Order(string Id, List<OrderItem> Items, int Total);

public static class Checkout
{
    public static readonly Dictionary<string, CatalogEntry> Catalog = new()
    {
        ["sku-blue-tshirt"] = new CatalogEntry("Blue T-shirt", 2000),
        ["sku-red-mug"] = new CatalogEntry("Red mug", 900),
    };

    static readonly List<Order> Orders = new();

    public static Order CreateOrder(string id, OrderRequest request)
    {
        int total = 0;
        foreach (var item in request.Items)
        {
            if (!Catalog.TryGetValue(item.ProductId, out var entry))
            {
                throw new ArgumentException($"Unknown product: {item.ProductId}");
            }
            if (item.Quantity <= 0)
            {
                throw new ArgumentException($"Quantity must be positive: {item.ProductId}");
            }
            total = checked(total + item.Quantity * entry.Price);
        }
        var order = new Order(id, request.Items, total);
        Orders.Add(order);
        return order;
    }

    public static Order? GetOrder(string id)
    {
        foreach (var order in Orders)
        {
            if (order.Id == id)
            {
                return order;
            }
        }
        return null;
    }
}
