import { useEffect, useRef, useState } from "react";

export function useAsyncData<T>(loader: () => Promise<T>, fallback: T) {
  const fallbackRef = useRef(fallback);
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  fallbackRef.current = fallback;

  useEffect(() => {
    let active = true;

    loader()
      .then((nextData) => {
        if (active) {
          setData(nextData);
        }
      })
      .catch(() => {
        if (active) {
          setData(fallbackRef.current);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loader]);

  return { data, loading };
}
