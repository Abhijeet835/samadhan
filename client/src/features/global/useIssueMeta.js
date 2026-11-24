import { useEffect, useState } from 'react';

import api from '@/lib/api';

/** Fees + tier thresholds from the backend settings — never hardcoded. */
export function useIssueMeta() {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get('/issues/meta')
      .then((res) => {
        if (active) setMeta(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return meta;
}
