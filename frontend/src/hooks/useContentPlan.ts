import { useState, useEffect, useCallback, useRef } from 'react';
import type { ContentPlanPage, ContentPlanStats, BatchStatus, ImportPageInput } from '@/types/content-plan';
import {
  importContentPlan,
  getContentPlan,
  deleteContentPlan,
  startBatchGeneration,
  getContentPlanStatus,
  cancelBatch as cancelBatchApi,
  generateSinglePage,
  updateContentPlanPage,
  deleteContentPlanPage,
} from '@/services/api';

export function useContentPlan(projectId: string | undefined) {
  const [pages, setPages] = useState<ContentPlanPage[]>([]);
  const [stats, setStats] = useState<ContentPlanStats>({ total: 0, pending: 0, generating: 0, completed: 0, failed: 0, skipped: 0 });
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPages = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getContentPlan(projectId);
      if (result.success && result.data) {
        setPages(result.data.pages);
        setStats(result.data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content plan');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const importPages = useCallback(async (pageInputs: ImportPageInput[]) => {
    if (!projectId) return;
    setError(null);
    try {
      const result = await importContentPlan(projectId, pageInputs);
      if (result.success) {
        await fetchPages();
      } else {
        setError(result.error?.message || 'Failed to import pages');
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import pages');
      throw err;
    }
  }, [projectId, fetchPages]);

  const clearPages = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      await deleteContentPlan(projectId);
      setPages([]);
      setStats({ total: 0, pending: 0, generating: 0, completed: 0, failed: 0, skipped: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear content plan');
    }
  }, [projectId]);

  const generateSingle = useCallback(async (pageId: string) => {
    setError(null);
    try {
      const result = await generateSinglePage(pageId);
      if (result.success) {
        await fetchPages();
      } else {
        setError(result.error?.message || 'Failed to generate article');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate article');
      // Still refresh to see the failed status
      await fetchPages();
    }
  }, [fetchPages]);

  const generateBatch = useCallback(async (pageIds?: string[], options?: Record<string, unknown>) => {
    if (!projectId) return;
    setError(null);
    try {
      const result = await startBatchGeneration(projectId, pageIds, options);
      if (result.success && result.data) {
        setBatchStatus(result.data);
        startPolling();
      } else {
        setError(result.error?.message || 'Failed to start batch generation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start batch generation');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const cancelBatch = useCallback(async () => {
    if (!projectId) return;
    try {
      await cancelBatchApi(projectId);
      stopPolling();
      await fetchPages();
      setBatchStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel batch');
    }
  }, [projectId, fetchPages]);

  const updatePage = useCallback(async (pageId: string, data: { keywords?: string; generationStatus?: 'pending' | 'skipped' }) => {
    setError(null);
    try {
      const result = await updateContentPlanPage(pageId, data);
      if (result.success) {
        await fetchPages();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update page');
    }
  }, [fetchPages]);

  const deletePage = useCallback(async (pageId: string) => {
    setError(null);
    try {
      await deleteContentPlanPage(pageId);
      await fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
    }
  }, [fetchPages]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (!projectId) return;
      try {
        const result = await getContentPlanStatus(projectId);
        if (result.success && result.data) {
          setBatchStatus(result.data);
          setStats(result.data.stats);
          // Refresh pages to get updated statuses
          const pagesResult = await getContentPlan(projectId);
          if (pagesResult.success && pagesResult.data) {
            setPages(pagesResult.data.pages);
          }
          if (!result.data.running) {
            stopPolling();
            setBatchStatus(null);
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Check for running batch on load
  useEffect(() => {
    if (!projectId) return;
    getContentPlanStatus(projectId).then((result) => {
      if (result.success && result.data?.running) {
        setBatchStatus(result.data);
        startPolling();
      }
    }).catch(() => {});
  }, [projectId, startPolling]);

  return {
    pages,
    stats,
    batchStatus,
    loading,
    error,
    importPages,
    clearPages,
    generateSingle,
    generateBatch,
    cancelBatch,
    updatePage,
    deletePage,
    refreshPages: fetchPages,
  };
}
