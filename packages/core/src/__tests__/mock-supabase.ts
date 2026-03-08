import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

interface MockResult {
  data: unknown;
  error: { code: string; message: string } | null;
  count?: number | null;
}

/**
 * Shared counter so sequential `.from("same_table")` calls
 * advance through the results sequence correctly.
 */
class TableSequence {
  private _results: MockResult[];
  private _index = 0;

  constructor(results: MockResult[]) {
    this._results = results;
  }

  next(): MockResult {
    const result = this._results[this._index] ?? this._results[this._results.length - 1];
    this._index++;
    return result ?? { data: null, error: null };
  }
}

class MockQueryBuilder {
  private _sequence: TableSequence;

  constructor(sequence: TableSequence) {
    this._sequence = sequence;
  }

  select(..._args: unknown[]) { return this; }
  insert(..._args: unknown[]) { return this; }
  update(..._args: unknown[]) { return this; }
  delete(..._args: unknown[]) { return this; }
  upsert(..._args: unknown[]) { return this; }
  eq(..._args: unknown[]) { return this; }
  neq(..._args: unknown[]) { return this; }
  in(..._args: unknown[]) { return this; }
  order(..._args: unknown[]) { return this; }
  limit(..._args: unknown[]) { return this; }
  range(..._args: unknown[]) { return this; }

  single() {
    return Promise.resolve(this._sequence.next());
  }

  maybeSingle() {
    return Promise.resolve(this._sequence.next());
  }

  then(onFulfilled?: (value: MockResult) => unknown, onRejected?: (reason: unknown) => unknown) {
    return Promise.resolve(this._sequence.next()).then(onFulfilled, onRejected);
  }
}

/**
 * Create a mock Supabase client for unit testing core service functions.
 *
 * Each `.from("table")` call creates a new MockQueryBuilder, but they share
 * the same TableSequence so queries advance through results in order.
 *
 * Usage:
 * ```ts
 * const mock = createMockSupabase();
 * mock.whenTable("fanflets").returns({ data: [...], error: null });
 * const result = await listFanflets(mock.client, "speaker-1");
 * ```
 *
 * For sequences of queries to the same table:
 * ```ts
 * mock.whenTable("fanflets").returnsSequence([
 *   { data: null, error: null, count: 0 },   // first query
 *   { data: null, error: null },              // second query
 *   { data: { id: "x" }, error: null },       // third query
 * ]);
 * ```
 */
export function createMockSupabase() {
  const sequences = new Map<string, TableSequence>();

  function getOrCreateSequence(table: string): TableSequence {
    if (!sequences.has(table)) {
      sequences.set(table, new TableSequence([{ data: null, error: null }]));
    }
    return sequences.get(table)!;
  }

  const client = {
    from: vi.fn((table: string) => new MockQueryBuilder(getOrCreateSequence(table))),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  return {
    client,

    whenTable(table: string) {
      return {
        returns(result: MockResult) {
          sequences.set(table, new TableSequence([result]));
          return this;
        },
        returnsSequence(results: MockResult[]) {
          sequences.set(table, new TableSequence(results));
          return this;
        },
      };
    },

    reset() {
      sequences.clear();
      (client.from as ReturnType<typeof vi.fn>).mockClear();
    },
  };
}
