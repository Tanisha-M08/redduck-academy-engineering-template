// 01-common-sense-check/src/Checkout.java
// A minimal order service. Plain Java, no framework.
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Checkout {
    public record CatalogEntry(String name, int price) {} // price in cents
    public record OrderItem(String productId, int quantity) {}
    public record OrderRequest(List<OrderItem> items) {}
    public record Order(String id, List<OrderItem> items, int total) {}

    // Product catalog: the only source of prices.
    public static final Map<String, CatalogEntry> CATALOG = Map.of(
        "sku-blue-tshirt", new CatalogEntry("Blue T-shirt", 2000),
        "sku-red-mug", new CatalogEntry("Red mug", 900)
    );

    private static final List<Order> ORDERS = new ArrayList<>();

    public static Order createOrder(String id, OrderRequest request) {
        int total = 0;
        for (OrderItem item : request.items()) {
            CatalogEntry entry = CATALOG.get(item.productId());
            if (entry == null) {
                throw new IllegalArgumentException("Unknown product: " + item.productId());
            }
            if (item.quantity() <= 0) {
                throw new IllegalArgumentException("Quantity must be positive: " + item.productId());
            }
            total = Math.addExact(total, Math.multiplyExact(item.quantity(), entry.price()));
        }
        Order order = new Order(id, request.items(), total);
        ORDERS.add(order);
        return order;
    }

    public static Order getOrder(String id) {
        for (Order order : ORDERS) {
            if (order.id().equals(id)) {
                return order;
            }
        }
        return null;
    }
}
