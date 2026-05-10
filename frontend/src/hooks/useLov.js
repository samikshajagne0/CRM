import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

/**
 * useLov — fetches and caches List of Values for a dropdown category.
 *
 * Matches backend route: GET /api/lov/:category
 * Returns an array of string values (active ones only).
 *
 * Usage:
 *   const { data: stages = [] } = useLov('opportunity_stage');
 */
export function useLov(category) {
  return useQuery({
    queryKey: ['lov', category],
    queryFn: async () => {
      const { data } = await apiClient.get(`/lov/${category}`);
      return data; // string[] from backend
    },
    staleTime: 1000 * 60 * 30, // LOVs rarely change — cache 30 minutes
    enabled: !!category,
  });
}

/**
 * Pre-fetches all common LOV categories at once after login.
 * Call this once in MainLayout after authentication.
 */
export const COMMON_LOVS = [
  'opportunity_stage',
  'lead_source',
  'industry',
  'account_type',
  'activity_type',
  'task_priority',
  'task_status',
  'invoice_status',
  'payment_mode',
  'project_status',
  'project_health',
  'entity',
  'collection_status',
  'escalation_level',
  'payment_schedule_status',
  'currency',
];

/**
 * usePrefetchLovs — Call this in the MainLayout to warm up the cache
 * for all common CRM dropdown categories.
 */
export function usePrefetchLovs() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    COMMON_LOVS.forEach((category) => {
      queryClient.prefetchQuery({
        queryKey: ['lov', category],
        queryFn: async () => {
          const { data } = await apiClient.get(`/lov/${category}`);
          return data;
        },
        staleTime: 1000 * 60 * 30,
      });
    });
  }, [queryClient]);
}
