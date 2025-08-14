import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { envelopeApi, transactionApi, budgetProfileApi } from '../services/budgetApi';
import { Envelope, Transaction, BudgetProfile } from '../types';
import { toast } from 'sonner';

// Query keys
export const BUDGET_QUERY_KEYS = {
  envelopes: 'envelopes',
  transactions: 'transactions',
  profiles: 'budget-profiles',
} as const;

// Envelope hooks
export const useEnvelopes = () => {
  return useQuery({
    queryKey: [BUDGET_QUERY_KEYS.envelopes],
    queryFn: envelopeApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateEnvelope = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: envelopeApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDGET_QUERY_KEYS.envelopes] });
      toast.success('Envelope created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create envelope');
    },
  });
};

export const useUpdateEnvelope = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...envelope }: { id: number } & Partial<Envelope>) => 
      envelopeApi.update(id, envelope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDGET_QUERY_KEYS.envelopes] });
      toast.success('Envelope updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update envelope');
    },
  });
};

export const useDeleteEnvelope = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: envelopeApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDGET_QUERY_KEYS.envelopes] });
      toast.success('Envelope deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete envelope');
    },
  });
};

// Transaction hooks
export const useTransactions = () => {
  return useQuery({
    queryKey: [BUDGET_QUERY_KEYS.transactions],
    queryFn: transactionApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: transactionApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDGET_QUERY_KEYS.transactions] });
      queryClient.invalidateQueries({ queryKey: [BUDGET_QUERY_KEYS.envelopes] });
      toast.success('Transaction created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create transaction');
    },
  });
};

// Budget Profile hooks
export const useBudgetProfiles = () => {
  return useQuery({
    queryKey: [BUDGET_QUERY_KEYS.profiles],
    queryFn: budgetProfileApi.getAll,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateBudgetProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: budgetProfileApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BUDGET_QUERY_KEYS.profiles] });
      toast.success('Budget profile created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create budget profile');
    },
  });
};