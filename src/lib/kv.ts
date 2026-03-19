import "server-only";

/**
 * KV abstraction:
 * - Uses Upstash Redis REST when configured (recommended for prod).
 * - Falls back to in-memory Map for local/dev (best-effort).
 *
 * Configure:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

type KVLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { exMs?: number }): Promise<void>;
  del(key: string): Promise<void>;
};

const mem = new Map<string, { v: string; exp: number | null }>();

function memGet(key: string) {
  const now = Date.now();
  const row = mem.get(key);
  if (!row) return null;
  if (row.exp !== null && row.exp <= now) {
    mem.delete(key);
    return null;
  }
  return row.v;
}

function memSet(key: string, value: string, exMs?: number) {
  const exp = typeof exMs === "number" ? Date.now() + exMs : null;
  mem.set(key, { v: value, exp });

  // opportunistic cleanup
  if (mem.size > 50_000) {
    const now = Date.now();
    for (const [k, r] of mem) {
      if (r.exp !== null && r.exp <= now) mem.delete(k);
      if (mem.size <= 50_000) break;
    }
  }
}

function memDel(key: string) {
  mem.delete(key);
}

async function createUpstash(): Promise<KVLike | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const base = url.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${token}` };

  return {
    async get(key) {
      const res = await fetch(`${base}/get/${encodeURIComponent(key)}`, { headers, cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { result: string | null };
      return data.result ?? null;
    },
    async set(key, value, opts) {
      const res = await fetch(`${base}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
        method: "POST",
        headers,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Upstash set failed");

      if (opts?.exMs && opts.exMs > 0) {
        const sec = Math.ceil(opts.exMs / 1000);
        const exRes = await fetch(`${base}/expire/${encodeURIComponent(key)}/${sec}`, {
          method: "POST",
          headers,
          cache: "no-store",
        });
        if (!exRes.ok) throw new Error("Upstash expire failed");
      }
    },
    async del(key) {
      const res = await fetch(`${base}/del/${encodeURIComponent(key)}`, { method: "POST", headers, cache: "no-store" });
      if (!res.ok) throw new Error("Upstash del failed");
    },
  };
}

let cached: Promise<KVLike> | null = null;

export async function getKV(): Promise<KVLike> {
  if (!cached) {
    cached = (async () => {
      const upstash = await createUpstash();
      if (upstash) return upstash;

      return {
        async get(key) {
          return memGet(key);
        },
        async set(key, value, opts) {
          memSet(key, value, opts?.exMs);
        },
        async del(key) {
          memDel(key);
        },
      };
    })();
  }
  return cached;
}
