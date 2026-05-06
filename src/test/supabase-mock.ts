// Tiny chainable mock for the supabase-js fluent query API.
//
// Real supabase-js calls look like:
//   supabase.from("t").select("*").eq("col", val).order(...).limit(...).maybeSingle()
// or end with .then(...) directly. The chain has to:
//   1. accept arbitrary intermediate methods (.select, .eq, .order, .limit, .in, ...)
//   2. resolve to a fixed { data, error } payload at the end
//   3. itself be a thenable so callers that don't add a terminal method still work
//
// `tableResult(payload)` returns a chain that always resolves to `payload`.
// `tableResults({ users: ..., posts: ... })` dispatches by table name.

import { vi } from "vitest";

export type SupabasePayload<T = unknown> = { data: T; error: null } | { data: null; error: { message: string } };

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
  "eq",
  "neq",
  "in",
  "is",
  "match",
  "order",
  "limit",
  "range",
  "filter",
  "or",
  "not",
  "contains",
  "containedBy",
  "ilike",
  "like",
] as const;

const TERMINAL_METHODS = ["maybeSingle", "single"] as const;

export const makeChain = <T,>(payload: SupabasePayload<T>) => {
  const promise: Promise<SupabasePayload<T>> = Promise.resolve(payload);
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") return promise.then.bind(promise);
      if (prop === "catch") return promise.catch.bind(promise);
      if (prop === "finally") return promise.finally.bind(promise);
      if (CHAIN_METHODS.includes(prop as (typeof CHAIN_METHODS)[number])) {
        return () => makeChain(payload);
      }
      if (TERMINAL_METHODS.includes(prop as (typeof TERMINAL_METHODS)[number])) {
        return () => promise;
      }
      return () => makeChain(payload);
    },
  };
  return new Proxy({}, handler) as Promise<SupabasePayload<T>> & Record<string, () => unknown>;
};

export const tableResults = (
  tables: Record<string, SupabasePayload<unknown>>,
  fallback: SupabasePayload<unknown> = { data: [], error: null },
) => vi.fn((name: string) => makeChain(tables[name] ?? fallback));

export const channelStub = () => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
});
