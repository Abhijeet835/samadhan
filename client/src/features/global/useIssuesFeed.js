import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import api from '@/lib/api';

export function useIssuesFeed() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ page: 1, limit: 12, category: '', status: '', q: '', sort: 'latest' });
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (current) => {
    setLoading(true);
    try {
      const params = { page: current.page, limit: current.limit, sort: current.sort };
      if (current.category) params.category = current.category;
      if (current.status) params.status = current.status;
      if (current.q.trim()) params.q = current.q.trim();
      const response = await api.get('/issues', { params });
      setIssues(response.data.issues);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load issues:', error);
      toast.error(t('issues.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Debounce text search so every keystroke does not hit the API.
  useEffect(() => {
    const timer = setTimeout(() => load(filters), filters.q ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return { issues, pagination, filters, setFilters, loading, reload: () => load(filters) };
}
