# Solution

## Language

language: "typescript"

## What was the problem

The store's records each carried a `passwordHash` alongside the username and role. The original
design let two paths reach those records in full: a lookup that returned a user's entire
`UserRecord`, and a report that was built by calling that lookup, so every report row carried a
password hash out of the store. The secret (the hash) and the convenience features shared one data
structure behind one object, so anything the convenience code could reach, any caller could reach
too. The leak was not in `verify` — it returned only a boolean — it was in the record-shaped hole
the other methods left open.

## The split

**Core — `UserStore`.** The records, the hashes, and the critical logic (`verify`) live inside the
`UserStore` class, and the record map is stored in an ECMAScript `#private` field (`#users`). The
core exposes exactly three operations, all hash-free by construction:

- `verify(username, password): boolean` — the one legitimate secret-using operation; it returns
  only a true/false answer.
- `getProfile(username): PublicProfile | null` — the narrow public-profile lookup. It returns a
  freshly built object containing only `username` and `role`.
- `listProfiles(): PublicProfile[]` — a hash-free enumeration of every user, also built from fresh
  objects.

There is deliberately no method that returns a `UserRecord`, a record map, a hash, or any object
that still points into core state. `PublicProfile` is an exported type with no `passwordHash`
field, so the hash-free contract is visible to callers and checked by the compiler.

**Periphery — `buildUserReport(store)`.** Reporting and formatting are convenience features the
core does not need, so they live outside the `UserStore` class as a free function in the same file
(the task allows editing only this one file; in a larger codebase it would be its own module). The
periphery communicates with the core exclusively through the narrow public interface: it calls
`store.listProfiles()` and formats each `PublicProfile` into a row like `"alice (admin)"`. Because
the only values it ever receives are hash-free `PublicProfile` copies, the report has no way to
include a hash — there is no code path from the periphery to a record or a hash to guard in the
first place. The copies are fresh objects per call, so the periphery cannot mutate core state
either.

## Removal versus guarding

A guarded design would keep the full-record lookup and put a check in front of the hash — an
access level, a role test, a "private" name. That leaves the path to the secret intact; every
future caller, refactor, or mistake reopens the same hole, and the guard's correctness becomes the
only thing standing between the secret and the outside world.

This split removes the path instead. No public method of `UserStore` returns a record or a hash,
so outside the class there is nothing to check, bribe, or bypass — the operation that would leak
does not exist. A vector that no longer exists cannot be misused; a guarded vector still can be,
whenever the guard is wrong, skipped, or forgotten.

## Language-level notes (honest limitations)

- The starter's `private` modifier is TypeScript-only and is erased at runtime — anyone could read
  `(store as any).users`. That is why the records live in an ECMAScript `#private` field: the
  JavaScript engine itself rejects `store.#users` from outside the class, and no standard reflection
  API (`Object.keys`, `Object.getOwnPropertyNames`, spread, `JSON.stringify`, `console.log`) can
  see or read it. This is runtime enforcement, not a convention.
- The boundary is the class body: code written *inside* `UserStore` can still touch `#users`. That
  is what "core" means here — everything inside that boundary is trusted; everything outside is not.
- The exported `PublicProfile` type is compile-time only and provides no runtime guarantee. The
  runtime guarantee comes from `#users` plus the fact that the public methods only ever construct
  new objects from `username` and `role`.
- One honest caveat about the given scaffolding: `store-data.ts` (which the task forbids editing)
  exports `SEED_USERS` — the seed records, hashes included — and the `hash` helper at module level,
  so anyone who imports that module can read the seed data directly. The store copies the seed
  records into its own `#private` map at construction, so the core's live state is no longer the
  same object as the imported `SEED_USERS` (mutating the imported object no longer affects what
  `verify` or the profiles do), but fully hiding the seed data would mean moving it inside the core
  module, which this task disallows. The no-leak guarantee above holds for the store's public
  interface, which is what this task governs.
