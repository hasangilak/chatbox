import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export interface AsyncResource<T> {
  status: Status;
  data: T | null;
  error: string | null;
  reload: () => Promise<void>;
  setData: (value: T | null | ((prev: T | null) => T | null)) => void;
}

/**
 * Minimal fetch-on-mount hook with a manual reload() trigger. No caching —
 * swap for SWR / React Query later if needed.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): AsyncResource<T> {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const result = await fnRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setStatus("success");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void run();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setDataWrapper = useCallback(
    (value: T | null | ((prev: T | null) => T | null)) => {
      setData((prev) =>
        typeof value === "function"
          ? (value as (prev: T | null) => T | null)(prev)
          : value,
      );
    },
    [],
  );

  return { status, data, error, reload: run, setData: setDataWrapper };
}
