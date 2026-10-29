// 03-core-periphery/src/Store.ts  —  TYPESCRIPT version.
// Only edit this file if you chose TypeScript, and complete just one language.
// Then declare it at the top of SOLUTION.md:  language: "typescript"
//
// Given (do not edit): ./store-data holds the UserRecord type, the seed users,
// and the hash helper. Done for you: verify, which returns only a boolean.
// Your job:
//   - add a hash-free public-profile lookup that returns username and role,
//   - rebuild report so it lists users without ever including a hash.
// Full description in TASK.md.

import { SEED_USERS, UserRecord, hash } from "./store-data";

// The only user shape the core ever hands out. It has no passwordHash field,
// so nothing that receives a PublicProfile can read, print, or forward a hash.
export interface PublicProfile {
  username: string;
  role: string;
}

// ---------------------------------------------------------------------------
// CORE — UserStore
//
// Owns every record, including the password hashes, and exposes only the
// operations the application genuinely needs:
//   verify(...)      — check a password, return a boolean
//   getProfile(...)  — read one user's hash-free public profile
//   listProfiles()   — enumerate every user's hash-free public profile
//
// No method returns a UserRecord, the users collection, or a hash. The record
// map lives in an ECMAScript #private field: the JavaScript engine itself —
// not the TypeScript compiler — refuses access from outside the class body,
// and no reflection API (Object.keys, Object.getOwnPropertyNames,
// JSON.stringify, spread, console.log) can reach it.
// ---------------------------------------------------------------------------
export class UserStore {
  #users: Map<string, UserRecord>;

  constructor() {
    // The core owns its own storage: copy the seed records instead of aliasing
    // the module-level SEED_USERS object, so the state behind the #private
    // field cannot be reached by mutating an imported reference.
    this.#users = new Map(
      Object.entries(SEED_USERS).map(([key, record]) => [key, { ...record }]),
    );
  }

  // The one legitimate core operation. It checks a password and returns only a boolean.
  verify(username: string, password: string): boolean {
    const user = this.#users.get(username);
    if (!user) return false;
    return user.passwordHash === hash(password);
  }

  // Narrow, hash-free public-profile lookup. Returns a fresh object built from
  // the record's public fields; the record itself never leaves the core.
  getProfile(username: string): PublicProfile | null {
    const user = this.#users.get(username);
    if (!user) return null;
    return { username: user.username, role: user.role };
  }

  // Narrow, hash-free enumeration. This is the only way any caller — inside
  // or outside the store — can list the users.
  listProfiles(): PublicProfile[] {
    return Array.from(this.#users.values(), (user) => ({
      username: user.username,
      role: user.role,
    }));
  }
}

// ---------------------------------------------------------------------------
// PERIPHERY — reporting
//
// Convenience functionality that the core does not need. It lives outside the
// UserStore class and reaches the users exclusively through the narrow public
// interface (listProfiles). It is given PublicProfile values, which by
// construction contain no hash, so the report cannot leak one even by accident:
// there is no code path from this function to a UserRecord or a hash.
//
// It is a free function rather than a store method because the task restricts
// edits to this one file; in a larger codebase it would live in its own module
// and import only the UserStore type and its public methods.
// ---------------------------------------------------------------------------
export function buildUserReport(store: UserStore): string[] {
  return store.listProfiles().map((profile) => `${profile.username} (${profile.role})`);
}
