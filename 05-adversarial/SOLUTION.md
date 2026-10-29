# Solution

## Language

language: "python"

## The attack

The attacker starts with 0 points, and the victim starts with 100 points. The attacker calls `transfer("attacker", "victim", -25)`. Because the service accepts a negative amount, the attacker's balance increases to 25 and the victim's balance decreases to 75.

The attacker gains 25 points using only the public interface.

## Why it works at the design level

The service allows the caller to control the sign of the transfer amount. A negative amount reverses the intended direction of the transfer: the sender gains points while the recipient loses them.

The underlying design problem is that the service treats a signed number as a valid transfer amount without ensuring that the amount represents a positive transfer.

## Patch or elimination?

A simple patch is to reject amounts less than or equal to zero inside `transfer`. This blocks negative transfers at runtime.

A stronger design eliminates the condition by representing transfer amounts with a positive-only type that cannot express negative values, and accepting only that type in the transfer operation. This makes invalid amounts harder to express instead of relying only on a runtime check.

## Verification

The test starts with attacker = 0 and victim = 100, executes the negative transfer through the public interface, and asserts that the attacker ends with 25 points and the victim with 75.
