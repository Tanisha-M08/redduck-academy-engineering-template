# Solution

For each problem, one question: is the constraint intrinsic to the required outcome, or does it
exist only because of the method first chosen to reach it? A real bypass removes the constraint
from the problem — it does not merely make the constrained approach cheaper, faster, or more
retried.

| # | Problem | Verdict | The constraint is… |
| - | ------- | ------- | ----------------- |
| 1 | Running total over 100,000 records | Bypass exists | an artifact of computing the total at read time in the application |
| 2 | Certainty over a channel that can drop anything | No bypass | intrinsic — certainty requires evidence crossing the only channel, which may drop any evidence |
| 3 | No double charge on a double-click submit | Bypass exists | an artifact of intercepting the second event in the browser instead of enforcing uniqueness where money moves |

---

## Problem 1 — Running total across a hundred thousand records

**Verdict:** A bypass exists.

**Exact constraint.** "To know the total you must read all the records" is true only of the chosen
method: fetch every row at query time and sum them in the application. The actual requirement is
narrower — the dashboard must *show* the current total. The genuinely intrinsic part is small: the
total is a function of all 100,000 values, so *someone, sometime* must have read each record's
value once. What the method adds is the repetition: re-reading the whole table on every refresh.

**Reasoning.** Aggregation is a pure function of the data, and the value of a pure function over
slowly changing data can be stored instead of recomputed. The fetch-all design pays a full scan
per query only because the computation was placed at read time and inside the application. Note
what would *not* be a bypass: `SELECT SUM(value) FROM records` moves the scan into the database
and avoids shipping 100,000 rows over the network, but the database still touches every record —
that design is merely cheaper, and "reads fewer records" still pays the constraint.

**Solution.** Maintain the total incrementally at write time. Store one aggregate value next to
the records (a `total` column, a counter row, or a materialized aggregate) and update it in the
same transaction as every write:

- insert: `total += value`
- update: `total += (newValue − oldValue)`
- delete: `total -= value`

The dashboard then reads a single number: O(1), no scan. The work of examining every record is
shifted from query time to write time and paid once per write as a delta, instead of 100,000 reads
per refresh. In the finished design no component ever re-reads the full table to answer the
dashboard's question — the constraint is removed, not mitigated. The one-time backfill of the
initial total does read every record once; that one-time cost is the intrinsic part and stays.

**Trade-offs and assumptions.** The aggregate must be updated atomically with the rows (same
transaction) or it drifts; a scheduled recompute is the safety net if any write path ever bypasses
the maintenance logic. Writes get slightly more expensive and the aggregate costs one extra column
— the cost moves from every read to every write, which is the right trade for a read-heavy
dashboard. "Running total" here means the current total; if the requirement ever grew to totals at
arbitrary past timestamps, an append-only log plus periodic checkpoints would handle that — a
different requirement, not a hidden cost of this one.

---

## Problem 2 — Certainty of delivery over a channel that can drop anything

**Verdict:** No bypass exists.

**Exact constraint.** The sender's certainty must be produced by evidence, and the only source of
evidence is the one channel that is allowed to silently drop any message, data or acknowledgement
alike. This is not the reliability problem "ACKs sometimes get lost"; it is the stronger statement
that *every possible input to the sender's knowledge is lossy and unverifiable*.

**Reasoning.** Take any protocol that retries until an acknowledgement arrives, and compare two
runs of the channel:

- Run A: the message is dropped before reaching the recipient. Nothing is ever acknowledged.
- Run B: the message is delivered, and every acknowledgement the recipient sends is dropped.

From the sender's side the two runs are identical — silence in every round — yet in one the
message arrived and in the other it did not. No sender-observable state can therefore imply "the
message arrived". More generally, any finite exchange the sender survives can be extended by
dropping the next message, so the sender can never *reach* certainty. And the obvious solution's
loop — retry "until one gets through" — presumes an exit condition (an ACK arrives) the problem
never grants: with no liveness guarantee on the channel, the loop may retry forever without the
outcome ever occurring. Retrying more times, faster, or with smarter timeouts still pays the
constraint; per the task's own rule, that does not count as a bypass.

**Justification.** The constraint belongs to the outcome itself. "Certain" is a knowledge claim,
and knowledge of delivery must be carried by evidence crossing the only channel — the very thing
the channel model permits to drop any evidence. With this channel model the stated outcome is not
just hard but *unreachable by any design*, obvious or otherwise. Both genuine escapes change the
problem rather than bypass the constraint: (1) add a second, independent path for evidence (a
shared log both parties read, a phone call, a courier) — but the problem states this is the only
channel; or (2) weaken "certain" to "detectably almost-certain" — a different requirement. Note
that the channel's reliability cannot be established *by agreement over that same channel*; that
is precisely what this impossibility forbids.

**Trade-offs and assumptions.** Real systems never promise certainty over a lossy channel; they
promise something weaker and useful: sequence numbers plus duplicate suppression at the receiver
give at-least-once delivery with detectable gaps, and repeated or delayed acknowledgements push
the residual loss probability arbitrarily low. If the requirement were restated as a tolerance
(e.g. "probability of undetected loss below 10⁻⁹"), acknowledgements and retries become sound
engineering — but adopting that tolerance is a change of requirement, which is exactly how the
constraint's intrinsic nature shows itself.

---

## Problem 3 — Avoiding a double charge when the customer double-clicks submit

**Verdict:** A bypass exists.

**Exact constraint.** "You must catch the duplicate as it happens" is an artifact of treating the
problem as *event interception* at the click. The required outcome is about the money, not the
mouse: the customer is charged at most once per payment intent. Nothing in that outcome requires
anyone to win a race in the browser; the constraint appears only because the first design let each
click directly cause a charge and then tried to stop the second click in time.

**Reasoning.** The browser is not a reliable gatekeeper. There is no atomic "check, then block"
that spans click → network → server: a disabled button, a click handler, or a client-side timer
are all advisory, and duplicates arise without any double-click at all — Enter key plus click, two
tabs, a network-layer retry of a slow request, a refresh-and-resubmit. Any design whose correctness
depends on detecting the second event before it fires pays the "in time" constraint forever, and
blocking the click *faster* is explicitly not a bypass. The authoritative component in this problem
is the one that can actually move money — the payment server or payment provider — so correctness
must be enforced there.

**Solution.** Make charging idempotent per payment intent, so a duplicate cannot take effect;
identity decides, not timing.

1. **One intent, one key.** When the order or payment intent is created, mint a unique
   `idempotencyKey` (server-generated, stored with the order). It is stable across every submit of
   the same form and distinct between different payments.
2. **The charge endpoint accepts each key at most once.** Enforce this durably — a unique
   constraint in the system of record (insert the key, then charge the winner), and/or the payment
   provider's native idempotency-key parameter on the charge API.
3. **Duplicates collapse.** The first request with the key performs the charge; any duplicate —
   second click, second tab, network retry, resubmitted form — collides with the key and is
   rejected or answered with the first request's stored result.

The finished design never observes click timing at all: a duplicate arriving one millisecond or
one hour late still cannot create a second charge. The constraint "catch it as it happens" is
gone from the problem, not merely cheaper to pay.

**Trade-offs and assumptions.** Key scoping is the sharp edge: a key must identify exactly one
logical payment, so a genuine new payment (a second order, an intentional "pay again") gets a
fresh key — reusing one would wrongly swallow a legitimate charge. Enforcement must be global and
durable (database unique index or provider API); an in-process lock does not survive restarts or
multiple instances. Concurrent duplicates race to the constraint: one wins, and the losers must
return the winner's outcome — including a "still processing" state for asynchronous providers —
rather than an error, so the second click's UX stays sane. Some bookkeeping follows: store
responses for replay and expire keys on a policy. Button disabling can remain as courtesy UX, but
it is no longer load-bearing. The same mechanism also covers every other duplicate source, which
is the tell that the original constraint belonged to the method, not the outcome.
