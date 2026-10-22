// Data hooks. Components call these; they call the client seam.
// Swapping mock → HTTP changes nothing here.

import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from './index';
import type { WorkflowStatus } from './client';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const workflowKey = ['workflows'] as const;
const executionKey = ['executions'] as const;

export function useWorkflows() {
  return useQuery({ queryKey: workflowKey, queryFn: () => client.listWorkflows() });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: [...workflowKey, id],
    queryFn: () => client.getWorkflow(id ?? ''),
    enabled: id !== undefined,
  });
}

export function useCreateWorkflow() {
  const invalidate = useInvalidateWorkflows();
  return useMutation({
    mutationFn: (name: string) => client.createWorkflow(name),
    onSuccess: invalidate,
  });
}

export function useRenameWorkflow() {
  const qc = useQueryClient();
  const invalidate = useInvalidateWorkflows();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => client.renameWorkflow(id, name),
    onSuccess: (_wf, { id }) => {
      invalidate();
      void qc.invalidateQueries({ queryKey: [...workflowKey, id] });
    },
  });
}

export function useExecutions(refetchInterval?: number) {
  return useQuery({ queryKey: executionKey, queryFn: () => client.listExecutions(), refetchInterval });
}

function useInvalidateWorkflows() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: workflowKey });
}

export function useSetWorkflowStatus() {
  const invalidate = useInvalidateWorkflows();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkflowStatus }) =>
      client.setWorkflowStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDuplicateWorkflow() {
  const invalidate = useInvalidateWorkflows();
  return useMutation({
    mutationFn: (id: string) => client.duplicateWorkflow(id),
    onSuccess: invalidate,
  });
}

export function useDeleteWorkflow() {
  const invalidate = useInvalidateWorkflows();
  return useMutation({
    mutationFn: (id: string) => client.deleteWorkflow(id),
    onSuccess: invalidate,
  });
}

export function useSetStarred() {
  const invalidate = useInvalidateWorkflows();
  return useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => client.setStarred(id, starred),
    onSuccess: invalidate,
  });
}
