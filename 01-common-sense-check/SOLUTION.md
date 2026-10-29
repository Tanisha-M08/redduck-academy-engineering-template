## The attack
1. A customer picks the Blue T-shirt, which really costs 2000.
2. They send an order with Price: 1 and Quantity: 1.
3. The code multiplies the price they sent, so the total is 1.
4. They get the T-shirt for 1 cent.
Also, a negative quantity could lower the total.

## The fix
The customer no longer sends a price. The code looks up the price in the
Catalog. It also rejects unknown products and quantities of 0 or less.

## Patched or removed?
I removed the cause. A patch would compare the customer's price with the
catalog price, but the customer could still send a price. I deleted the
Price field, so there is nothing left to lie about.
