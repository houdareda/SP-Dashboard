import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase admin environment variables. Please check .env.local");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Helper to fetch all rows beyond Supabase's default 1000-row limit using parallel chunked requests.
 */
export async function fetchAllRows<T = any>(
  table: string,
  selectCols: string,
  filterBuilder?: (query: any) => any,
  chunkSize: number = 1000
): Promise<T[]> {
  try {
    let countQuery = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
    if (filterBuilder) {
      countQuery = filterBuilder(countQuery);
    }
    const { count, error: countErr } = await countQuery;
    if (countErr) {
      console.error(`fetchAllRows count error on ${table}:`, countErr);
      return [];
    }
    if (!count || count === 0) return [];

    if (count <= chunkSize) {
      let q = supabaseAdmin.from(table).select(selectCols).range(0, count - 1);
      if (filterBuilder) q = filterBuilder(q);
      const { data, error } = await q;
      if (error) {
        console.error(`fetchAllRows data error on ${table}:`, error);
        return [];
      }
      return (data || []) as T[];
    }

    const chunksCount = Math.ceil(count / chunkSize);
    const promises: PromiseLike<any>[] = [];

    for (let i = 0; i < chunksCount; i++) {
      const from = i * chunkSize;
      const to = from + chunkSize - 1;
      let q = supabaseAdmin.from(table).select(selectCols).range(from, to);
      if (filterBuilder) {
        q = filterBuilder(q);
      }
      promises.push(q);
    }

    const results = await Promise.all(promises);
    let allData: T[] = [];
    for (const res of results) {
      if (res.data) {
        allData = allData.concat(res.data);
      }
    }
    return allData;
  } catch (err) {
    console.error(`fetchAllRows exception on ${table}:`, err);
    return [];
  }
}
