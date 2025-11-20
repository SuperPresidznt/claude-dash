'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MetricCard } from '@/components/metric-card';
import { useToast } from '@/components/ui/toast-provider';
import { trackEvent } from '@/lib/analytics';
import type { AnalyticsEventName, AnalyticsPayload } from '@/lib/analytics';

import type {
  SerializedAsset,
  SerializedLiability,
  SerializedCashflow,
  SerializedCashflowTemplate,
  FinanceSummary,
  FinanceTotals,
  BudgetEnvelopeWithActuals
} from '@/lib/finance';

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

const postJson = async <T,>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

const patchJson = async <T,>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

const deleteRequest = async (url: string): Promise<void> => {
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

const centsToCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100);

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

type SummaryResponse = {
  summary: FinanceSummary;
  totals: FinanceTotals;
  currency: string;
};

type FinanceDashboardProps = {
  userId: string;
  currency: string;
  initialAssets: SerializedAsset[];
  initialLiabilities: SerializedLiability[];
  initialCashflow: SerializedCashflow[];
  initialTemplates: SerializedCashflowTemplate[];
  initialBudgets: BudgetEnvelopeWithActuals[];
  initialSummary: FinanceSummary;
  initialTotals: FinanceTotals;
};

type AssetFormState = {
  name: string;
  category: string;
  value: string;
  isLiquid: boolean;
  note: string;
};

type AssetFieldErrors = Partial<Record<'name' | 'category' | 'value', string>>;

type LiabilityFormState = {
  name: string;
  category: string;
  balance: string;
  aprPercent: string;
  minimumPayment: string;
  note: string;
};

type LiabilityFieldErrors = Partial<Record<'name' | 'category' | 'balance' | 'aprPercent' | 'minimumPayment', string>>;

type CashflowFormState = {
  description: string;
  category: string;
  amount: string;
  direction: 'inflow' | 'outflow';
  date: string;
  note: string;
};

type CashflowFilters = {
  direction: 'all' | CashflowFormState['direction'];
  category: 'all' | string;
  startDate: string;
  endDate: string;
  search: string;
};

type CashflowFieldErrors = Partial<Record<'description' | 'category' | 'amount' | 'date', string>>;

type BudgetFormState = {
  name: string;
  category: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  target: string;
  note: string;
};

type BudgetFieldErrors = Partial<Record<'name' | 'category' | 'target', string>>;

type TemplateFormState = {
  name: string;
  category: string;
  direction: 'inflow' | 'outflow';
  amount: string;
  defaultNote: string;
  dayOfMonth: string;
};

type TemplateFieldErrors = Partial<Record<'name' | 'category' | 'amount', string>>;

type KpiCard = {
  label: string;
  value: string;
  helper: string;
};

const defaultCashflowFilters: CashflowFilters = {
  direction: 'all',
  category: 'all',
  startDate: '',
  endDate: '',
  search: ''
};

const CASHFLOW_FILTERS_STORAGE_KEY = 'sig:finance:cashflowFilters';

const exportCashflowCsv = (rows: SerializedCashflow[], currency: string) => {
  if (!rows.length) return;

  const header = `Date,Description,Category,Direction,Amount (${currency}),Note`;
  const formatCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = rows.map((txn) =>
    [
      new Date(txn.date).toISOString().slice(0, 10),
      txn.description,
      txn.category,
      txn.direction,
      (txn.amountCents / 100).toFixed(2),
      txn.note ?? ''
    ]
      .map((cell) => formatCell(cell))
      .join(',')
  );

  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cashflow-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return 'Something went wrong. Please try again.';
};

export function FinanceDashboard({
  userId,
  currency,
  initialAssets,
  initialLiabilities,
  initialCashflow,
  initialTemplates,
  initialBudgets,
  initialSummary,
  initialTotals
}: FinanceDashboardProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const showSuccessToast = (description: string) => showToast({ description, variant: 'success' });
  const showErrorToast = (description: string) =>
    showToast({ title: 'Finance action failed', description, variant: 'error' });
  const emitEvent = (eventName: AnalyticsEventName, payload?: AnalyticsPayload) =>
    trackEvent(eventName, { userId, panel: 'finance', ...payload });
  const handleMutationFailure = (
    error: Error,
    fallback: string,
    setError?: (message: string) => void
  ) => {
    const message = getErrorMessage(error) || fallback;
    if (setError) {
      setError(message);
    }
    showErrorToast(message);
  };
  const handleMutationSuccess = (
    description: string,
    options?: { event: AnalyticsEventName; payload?: AnalyticsPayload }
  ) => {
    showSuccessToast(description);
    if (options) {
      emitEvent(options.event, options.payload);
    }
  };

  const assetsQuery = useQuery({
    queryKey: ['finance', 'assets'],
    queryFn: () => fetchJson<SerializedAsset[]>('/api/finance/assets'),
    initialData: initialAssets
  });

  const liabilitiesQuery = useQuery({
    queryKey: ['finance', 'liabilities'],
    queryFn: () => fetchJson<SerializedLiability[]>('/api/finance/liabilities'),
    initialData: initialLiabilities
  });

  const cashflowQuery = useQuery({
    queryKey: ['finance', 'cashflow'],
    queryFn: () => fetchJson<SerializedCashflow[]>('/api/finance/cashflow'),
    initialData: initialCashflow
  });

  const templatesQuery = useQuery({
    queryKey: ['finance', 'templates'],
    queryFn: () => fetchJson<SerializedCashflowTemplate[]>('/api/finance/cashflow/templates'),
    initialData: initialTemplates
  });

  const budgetsQuery = useQuery({
    queryKey: ['finance', 'budgets'],
    queryFn: () => fetchJson<BudgetEnvelopeWithActuals[]>('/api/finance/budgets'),
    initialData: initialBudgets
  });

  const summaryQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: () => fetchJson<SummaryResponse>('/api/finance/summary'),
    initialData: { summary: initialSummary, totals: initialTotals, currency }
  });

  const assets = assetsQuery.data ?? initialAssets;
  const liabilities = liabilitiesQuery.data ?? initialLiabilities;
  const cashflow = cashflowQuery.data ?? initialCashflow;
  const templates = templatesQuery.data ?? initialTemplates;
  const budgets = budgetsQuery.data ?? initialBudgets;

  const { summary, totals } = summaryQuery.data ?? {
    summary: initialSummary,
    totals: initialTotals
  };

  type AssetFormState = {
    name: string;
    category: string;
    value: string;
    isLiquid: boolean;
    note: string;
  };

  const defaultAssetForm: AssetFormState = {
    name: '',
    category: '',
    value: '',
    isLiquid: false,
    note: ''
  };

  const [assetForm, setAssetForm] = useState<AssetFormState>(defaultAssetForm);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<SerializedAsset | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetFieldErrors, setAssetFieldErrors] = useState<AssetFieldErrors>({});

  type LiabilityFormState = {
    name: string;
    category: string;
    balance: string;
    aprPercent: string;
    minimumPayment: string;
    note: string;
  };

  const defaultLiabilityForm: LiabilityFormState = {
    name: '',
    category: '',
    balance: '',
    aprPercent: '',
    minimumPayment: '',
    note: ''
  };

  const [liabilityForm, setLiabilityForm] = useState<LiabilityFormState>(defaultLiabilityForm);
  const [liabilityDialogOpen, setLiabilityDialogOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<SerializedLiability | null>(null);
  const [liabilityError, setLiabilityError] = useState<string | null>(null);
  const [liabilityFieldErrors, setLiabilityFieldErrors] = useState<LiabilityFieldErrors>({});

  type CashflowFormState = {
    description: string;
    category: string;
    amount: string;
    direction: 'inflow' | 'outflow';
    date: string;
    note: string;
  };

  const defaultCashflowForm: CashflowFormState = {
    description: '',
    category: '',
    amount: '',
    direction: 'inflow',
    date: new Date().toISOString().slice(0, 10),
    note: ''
  };

  const [cashflowForm, setCashflowForm] = useState<CashflowFormState>(defaultCashflowForm);
  const [cashflowDialogOpen, setCashflowDialogOpen] = useState(false);
  const [editingCashflow, setEditingCashflow] = useState<SerializedCashflow | null>(null);
  const [cashflowError, setCashflowError] = useState<string | null>(null);
  const [cashflowFieldErrors, setCashflowFieldErrors] = useState<CashflowFieldErrors>({});
  const [cashflowFilters, setCashflowFilters] = useState<CashflowFilters>(defaultCashflowFilters);
  const filtersHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(CASHFLOW_FILTERS_STORAGE_KEY) : null;
      if (!stored) {
        filtersHydratedRef.current = true;
        return;
      }
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        (parsed.direction === 'all' || parsed.direction === 'inflow' || parsed.direction === 'outflow') &&
        typeof parsed.category === 'string' &&
        typeof parsed.startDate === 'string' &&
        typeof parsed.endDate === 'string' &&
        typeof parsed.search === 'string'
      ) {
        setCashflowFilters(parsed as CashflowFilters);
      }
    } catch {
      // Ignore malformed storage
    } finally {
      filtersHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;
    try {
      window.localStorage.setItem(CASHFLOW_FILTERS_STORAGE_KEY, JSON.stringify(cashflowFilters));
    } catch {
      // Ignore storage write errors (e.g., private mode)
    }
  }, [cashflowFilters]);

  const defaultBudgetForm: BudgetFormState = {
    name: '',
    category: '',
    period: 'monthly',
    target: '',
    note: ''
  };

  const [budgetForm, setBudgetForm] = useState<BudgetFormState>(defaultBudgetForm);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetEnvelopeWithActuals | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [budgetFieldErrors, setBudgetFieldErrors] = useState<BudgetFieldErrors>({});

  const defaultTemplateForm: TemplateFormState = {
    name: '',
    category: '',
    direction: 'outflow',
    amount: '',
    defaultNote: '',
    dayOfMonth: ''
  };

  const [templateForm, setTemplateForm] = useState<TemplateFormState>(defaultTemplateForm);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SerializedCashflowTemplate | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateFieldErrors, setTemplateFieldErrors] = useState<TemplateFieldErrors>({});

  const filteredCashflow = useMemo(() => {
    return (cashflow ?? []).filter((txn) => {
      if (cashflowFilters.direction !== 'all' && txn.direction !== cashflowFilters.direction) {
        return false;
      }

      if (cashflowFilters.category !== 'all' && txn.category !== cashflowFilters.category) {
        return false;
      }

      if (cashflowFilters.startDate) {
        if (new Date(txn.date) < new Date(cashflowFilters.startDate)) {
          return false;
        }
      }

      if (cashflowFilters.endDate) {
        const nextDay = new Date(cashflowFilters.endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        if (new Date(txn.date) >= nextDay) {
          return false;
        }
      }

      if (cashflowFilters.search.trim()) {
        const needle = cashflowFilters.search.toLowerCase();
        const haystack = `${txn.description} ${txn.category} ${txn.note ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }

      return true;
    });
  }, [cashflow, cashflowFilters]);

  const uniqueCashflowCategories = useMemo(() => {
    const set = new Set<string>();
    (cashflow ?? []).forEach((txn) => set.add(txn.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cashflow]);

  const clearAssetFieldError = (field: keyof AssetFieldErrors) => {
    setAssetFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearLiabilityFieldError = (field: keyof LiabilityFieldErrors) => {
    setLiabilityFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearCashflowFieldError = (field: keyof CashflowFieldErrors) => {
    setCashflowFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearBudgetFieldError = (field: keyof BudgetFieldErrors) => {
    setBudgetFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearTemplateFieldError = (field: keyof TemplateFieldErrors) => {
    setTemplateFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const closeBudgetDialog = () => {
    setBudgetDialogOpen(false);
    setEditingBudget(null);
    setBudgetForm(defaultBudgetForm);
    setBudgetError(null);
    setBudgetFieldErrors({});
  };

  const openCreateBudget = () => {
    setEditingBudget(null);
    setBudgetForm(defaultBudgetForm);
    setBudgetDialogOpen(true);
    setBudgetFieldErrors({});
    setBudgetError(null);
  };

  const openEditBudget = (budget: BudgetEnvelopeWithActuals) => {
    setEditingBudget(budget);
    setBudgetForm({
      name: budget.name,
      category: budget.category,
      period: budget.period,
      target: (budget.targetCents / 100).toString(),
      note: budget.note ?? ''
    });
    setBudgetDialogOpen(true);
    setBudgetFieldErrors({});
    setBudgetError(null);
  };

  const closeTemplateDialog = () => {
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateForm(defaultTemplateForm);
    setTemplateError(null);
    setTemplateFieldErrors({});
  };

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(defaultTemplateForm);
    setTemplateDialogOpen(true);
    setTemplateFieldErrors({});
    setTemplateError(null);
  };

  const openEditTemplate = (template: SerializedCashflowTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      category: template.category,
      direction: template.direction,
      amount: (template.amountCents / 100).toString(),
      defaultNote: template.defaultNote ?? '',
      dayOfMonth: template.dayOfMonth != null ? template.dayOfMonth.toString() : ''
    });
    setTemplateDialogOpen(true);
    setTemplateFieldErrors({});
    setTemplateError(null);
  };

  const closeAssetDialog = () => {
    setAssetDialogOpen(false);
    setEditingAsset(null);
    setAssetForm(defaultAssetForm);
    setAssetError(null);
    setAssetFieldErrors({});
  };

  const openCreateAsset = () => {
    setEditingAsset(null);
    setAssetForm(defaultAssetForm);
    setAssetDialogOpen(true);
    setAssetFieldErrors({});
    setAssetError(null);
  };

  const openEditAsset = (asset: SerializedAsset) => {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name,
      category: asset.category,
      value: (asset.valueCents / 100).toString(),
      isLiquid: asset.isLiquid,
      note: asset.note ?? ''
    });
    setAssetDialogOpen(true);
    setAssetFieldErrors({});
    setAssetError(null);
  };

  const invalidateFinanceQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'assets'] });
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
  };

  const closeLiabilityDialog = () => {
    setLiabilityDialogOpen(false);
    setEditingLiability(null);
    setLiabilityForm(defaultLiabilityForm);
    setLiabilityError(null);
    setLiabilityFieldErrors({});
  };

  const openCreateLiability = () => {
    setEditingLiability(null);
    setLiabilityForm(defaultLiabilityForm);
    setLiabilityDialogOpen(true);
    setLiabilityFieldErrors({});
    setLiabilityError(null);
  };

  const openEditLiability = (liability: SerializedLiability) => {
    setEditingLiability(liability);
    setLiabilityForm({
      name: liability.name,
      category: liability.category,
      balance: (liability.balanceCents / 100).toString(),
      aprPercent: liability.aprPercent != null ? liability.aprPercent.toString() : '',
      minimumPayment: liability.minimumPayment != null ? (liability.minimumPayment / 100).toString() : '',
      note: liability.note ?? ''
    });
    setLiabilityDialogOpen(true);
    setLiabilityFieldErrors({});
    setLiabilityError(null);
  };

  const invalidateLiabilities = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'liabilities'] });
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
  };

  const closeCashflowDialog = () => {
    setCashflowDialogOpen(false);
    setEditingCashflow(null);
    setCashflowForm(defaultCashflowForm);
    setCashflowError(null);
    setCashflowFieldErrors({});
  };

  const openCreateCashflow = () => {
    setEditingCashflow(null);
    setCashflowForm(defaultCashflowForm);
    setCashflowDialogOpen(true);
    setCashflowFieldErrors({});
    setCashflowError(null);
  };

  const openEditCashflow = (txn: SerializedCashflow) => {
    setEditingCashflow(txn);
    setCashflowForm({
      description: txn.description,
      category: txn.category,
      amount: (txn.amountCents / 100).toString(),
      direction: txn.direction,
      date: txn.date.slice(0, 10),
      note: txn.note ?? ''
    });
    setCashflowDialogOpen(true);
    setCashflowFieldErrors({});
    setCashflowError(null);
  };

  const invalidateCashflow = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'cashflow'] });
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
  };

  const invalidateBudgets = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] });
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
  };

  const invalidateTemplates = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'templates'] });
  };

  const createAssetMutation = useMutation({
    mutationFn: (input: AssetFormState) => {
      const valueNumber = Number(input.value);
      return postJson<SerializedAsset>('/api/finance/assets', {
        name: input.name,
        category: input.category,
        valueCents: Math.round(valueNumber * 100),
        isLiquid: input.isLiquid,
        note: input.note ? input.note : undefined
      });
    },
    onSuccess: (asset) => {
      invalidateFinanceQueries();
      closeAssetDialog();
      handleMutationSuccess('Asset saved.', {
        event: 'finance.asset.created',
        payload: { assetId: asset.id, category: asset.category }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to save asset.', setAssetError)
  });

  const updateAssetMutation = useMutation({
    mutationFn: (payload: { asset: SerializedAsset; form: AssetFormState }) => {
      const valueNumber = Number(payload.form.value);
      return patchJson<SerializedAsset>(`/api/finance/assets/${payload.asset.id}`, {
        name: payload.form.name,
        category: payload.form.category,
        valueCents: Math.round(valueNumber * 100),
        isLiquid: payload.form.isLiquid,
        note: payload.form.note ? payload.form.note : null
      });
    },
    onSuccess: (asset) => {
      invalidateFinanceQueries();
      closeAssetDialog();
      handleMutationSuccess('Asset updated.', {
        event: 'finance.asset.updated',
        payload: { assetId: asset.id, category: asset.category }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to update asset.', setAssetError)
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => deleteRequest(`/api/finance/assets/${assetId}`),
    onSuccess: (_, assetId) => {
      invalidateFinanceQueries();
      closeAssetDialog();
      handleMutationSuccess('Asset removed.', {
        event: 'finance.asset.deleted',
        payload: { assetId }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to delete asset.', setAssetError)
  });

  const handleAssetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssetError(null);
    setAssetFieldErrors({});

    const errors: AssetFieldErrors = {};
    const trimmedValue = assetForm.value.trim();

    if (!assetForm.name.trim()) {
      errors.name = 'Name is required.';
    }

    if (!assetForm.category.trim()) {
      errors.category = 'Category is required.';
    }

    if (!trimmedValue) {
      errors.value = 'Value is required.';
    } else if (Number.isNaN(Number(trimmedValue))) {
      errors.value = 'Value must be a number.';
    }

    if (Object.keys(errors).length > 0) {
      setAssetFieldErrors(errors);
      setAssetError('Please fix the highlighted fields.');
      return;
    }

    if (editingAsset) {
      updateAssetMutation.mutate({ asset: editingAsset, form: assetForm });
    } else {
      createAssetMutation.mutate(assetForm);
    }
  };

  const handleAssetDelete = () => {
    if (!editingAsset) return;
    deleteAssetMutation.mutate(editingAsset.id);
  };

  const isSaving = createAssetMutation.isPending || updateAssetMutation.isPending;
  const isDeleting = deleteAssetMutation.isPending;

  const createLiabilityMutation = useMutation({
    mutationFn: (input: LiabilityFormState) => {
      const balanceNumber = Number(input.balance);
      const aprNumber = input.aprPercent ? Number(input.aprPercent) : undefined;
      const minimumPaymentNumber = input.minimumPayment ? Number(input.minimumPayment) : undefined;

      return postJson<SerializedLiability>('/api/finance/liabilities', {
        name: input.name,
        category: input.category,
        balanceCents: Math.round(balanceNumber * 100),
        aprPercent: aprNumber,
        minimumPayment: minimumPaymentNumber != null ? Math.round(minimumPaymentNumber * 100) : undefined,
        note: input.note ? input.note : undefined
      });
    },
    onSuccess: (liability) => {
      invalidateLiabilities();
      closeLiabilityDialog();
      handleMutationSuccess('Liability saved.', {
        event: 'finance.liability.created',
        payload: { liabilityId: liability.id, category: liability.category }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to save liability.', setLiabilityError)
  });

  const updateLiabilityMutation = useMutation({
    mutationFn: (payload: { liability: SerializedLiability; form: LiabilityFormState }) => {
      const balanceNumber = Number(payload.form.balance);
      const aprNumber = payload.form.aprPercent ? Number(payload.form.aprPercent) : undefined;
      const minimumPaymentNumber = payload.form.minimumPayment ? Number(payload.form.minimumPayment) : undefined;

      return patchJson<SerializedLiability>(`/api/finance/liabilities/${payload.liability.id}`, {
        name: payload.form.name,
        category: payload.form.category,
        balanceCents: Math.round(balanceNumber * 100),
        aprPercent: aprNumber,
        minimumPayment: minimumPaymentNumber != null ? Math.round(minimumPaymentNumber * 100) : undefined,
        note: payload.form.note ? payload.form.note : undefined
      });
    },
    onSuccess: (liability) => {
      invalidateLiabilities();
      closeLiabilityDialog();
      handleMutationSuccess('Liability updated.', {
        event: 'finance.liability.updated',
        payload: { liabilityId: liability.id, category: liability.category }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to update liability.', setLiabilityError)
  });

  const deleteLiabilityMutation = useMutation({
    mutationFn: (liabilityId: string) => deleteRequest(`/api/finance/liabilities/${liabilityId}`),
    onSuccess: (_, liabilityId) => {
      invalidateLiabilities();
      closeLiabilityDialog();
      handleMutationSuccess('Liability removed.', {
        event: 'finance.liability.deleted',
        payload: { liabilityId }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to delete liability.', setLiabilityError)
  });

  const handleLiabilitySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLiabilityError(null);
    setLiabilityFieldErrors({});

    const errors: LiabilityFieldErrors = {};
    const balanceTrimmed = liabilityForm.balance.trim();

    if (!liabilityForm.name.trim()) {
      errors.name = 'Name is required.';
    }

    if (!liabilityForm.category.trim()) {
      errors.category = 'Category is required.';
    }

    if (!balanceTrimmed) {
      errors.balance = 'Balance is required.';
    } else if (Number.isNaN(Number(balanceTrimmed))) {
      errors.balance = 'Balance must be a number.';
    }

    if (liabilityForm.aprPercent) {
      const aprValue = Number(liabilityForm.aprPercent);
      if (Number.isNaN(aprValue)) {
        errors.aprPercent = 'APR must be a number.';
      } else if (aprValue < 0 || aprValue > 100) {
        errors.aprPercent = 'APR must be between 0 and 100.';
      }
    }

    if (liabilityForm.minimumPayment) {
      const minimumNumber = Number(liabilityForm.minimumPayment);
      if (Number.isNaN(minimumNumber)) {
        errors.minimumPayment = 'Minimum payment must be a number.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setLiabilityFieldErrors(errors);
      setLiabilityError('Please fix the highlighted fields.');
      return;
    }

    if (editingLiability) {
      updateLiabilityMutation.mutate({ liability: editingLiability, form: liabilityForm });
    } else {
      createLiabilityMutation.mutate(liabilityForm);
    }
  };

  const handleLiabilityDelete = () => {
    if (!editingLiability) return;
    deleteLiabilityMutation.mutate(editingLiability.id);
  };

  const isLiabilitySaving = createLiabilityMutation.isPending || updateLiabilityMutation.isPending;
  const isLiabilityDeleting = deleteLiabilityMutation.isPending;

  const createCashflowMutation = useMutation({
    mutationFn: (input: CashflowFormState) => {
      const amountNumber = Number(input.amount);
      return postJson<SerializedCashflow>('/api/finance/cashflow', {
        description: input.description,
        category: input.category,
        amountCents: Math.round(amountNumber * 100),
        direction: input.direction,
        date: input.date ? new Date(input.date).toISOString() : undefined,
        note: input.note ? input.note : undefined
      });
    },
    onSuccess: (txn) => {
      invalidateCashflow();
      closeCashflowDialog();
      handleMutationSuccess('Transaction logged.', {
        event: 'finance.cashflow.created',
        payload: { cashflowId: txn.id, category: txn.category, direction: txn.direction }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to save transaction.', setCashflowError)
  });

  const updateCashflowMutation = useMutation({
    mutationFn: (payload: { txn: SerializedCashflow; form: CashflowFormState }) => {
      const amountNumber = Number(payload.form.amount);
      return patchJson<SerializedCashflow>(`/api/finance/cashflow/${payload.txn.id}`, {
        description: payload.form.description,
        category: payload.form.category,
        amountCents: Math.round(amountNumber * 100),
        direction: payload.form.direction,
        date: payload.form.date ? new Date(payload.form.date).toISOString() : undefined,
        note: payload.form.note ? payload.form.note : null
      });
    },
    onSuccess: (txn) => {
      invalidateCashflow();
      closeCashflowDialog();
      handleMutationSuccess('Transaction updated.', {
        event: 'finance.cashflow.updated',
        payload: { cashflowId: txn.id, category: txn.category, direction: txn.direction }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to update transaction.', setCashflowError)
  });

  const deleteCashflowMutation = useMutation({
    mutationFn: (txnId: string) => deleteRequest(`/api/finance/cashflow/${txnId}`),
    onSuccess: (_, txnId) => {
      invalidateCashflow();
      closeCashflowDialog();
      handleMutationSuccess('Transaction deleted.', {
        event: 'finance.cashflow.deleted',
        payload: { cashflowId: txnId }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to delete transaction.', setCashflowError)
  });

  const createBudgetMutation = useMutation({
    mutationFn: (input: BudgetFormState) => {
      const targetNumber = Number(input.target);
      return postJson<BudgetEnvelopeWithActuals>('/api/finance/budgets', {
        name: input.name,
        category: input.category,
        period: input.period,
        targetCents: Math.round(targetNumber * 100),
        note: input.note ? input.note : undefined
      });
    },
    onSuccess: (budget) => {
      invalidateBudgets();
      closeBudgetDialog();
      handleMutationSuccess('Budget saved.', {
        event: 'finance.budget.created',
        payload: { budgetId: budget.id, category: budget.category }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to save budget.', setBudgetError)
  });

  const updateBudgetMutation = useMutation({
    mutationFn: (payload: { budget: BudgetEnvelopeWithActuals; form: BudgetFormState }) => {
      const targetNumber = Number(payload.form.target);
      return patchJson<BudgetEnvelopeWithActuals>(`/api/finance/budgets/${payload.budget.id}`, {
        name: payload.form.name,
        category: payload.form.category,
        period: payload.form.period,
        targetCents: Math.round(targetNumber * 100),
        note: payload.form.note ? payload.form.note : null
      });
    },
    onSuccess: (budget) => {
      invalidateBudgets();
      closeBudgetDialog();
      handleMutationSuccess('Budget updated.', {
        event: 'finance.budget.updated',
        payload: { budgetId: budget.id, category: budget.category }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to update budget.', setBudgetError)
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (budgetId: string) => deleteRequest(`/api/finance/budgets/${budgetId}`),
    onSuccess: (_, budgetId) => {
      invalidateBudgets();
      closeBudgetDialog();
      handleMutationSuccess('Budget removed.', {
        event: 'finance.budget.deleted',
        payload: { budgetId }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to delete budget.', setBudgetError)
  });

  const handleCashflowSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCashflowError(null);
    setCashflowFieldErrors({});

    const errors: CashflowFieldErrors = {};
    const amountTrimmed = cashflowForm.amount.trim();

    if (!cashflowForm.description.trim()) {
      errors.description = 'Description is required.';
    }

    if (!cashflowForm.category.trim()) {
      errors.category = 'Category is required.';
    }

    if (!amountTrimmed) {
      errors.amount = 'Amount is required.';
    } else if (Number.isNaN(Number(amountTrimmed))) {
      errors.amount = 'Amount must be a number.';
    }

    if (!cashflowForm.date) {
      errors.date = 'Date is required.';
    }

    if (Object.keys(errors).length > 0) {
      setCashflowFieldErrors(errors);
      setCashflowError('Please fix the highlighted fields.');
      return;
    }

    if (editingCashflow) {
      updateCashflowMutation.mutate({ txn: editingCashflow, form: cashflowForm });
    } else {
      createCashflowMutation.mutate(cashflowForm);
    }
  };

  const handleCashflowDelete = () => {
    if (!editingCashflow) return;
    deleteCashflowMutation.mutate(editingCashflow.id);
  };

  const isCashflowSaving = createCashflowMutation.isPending || updateCashflowMutation.isPending;
  const isCashflowDeleting = deleteCashflowMutation.isPending;

  const createTemplateMutation = useMutation({
    mutationFn: (input: TemplateFormState) => {
      const amountNumber = Number(input.amount);
      return postJson<SerializedCashflowTemplate>('/api/finance/cashflow/templates', {
        name: input.name,
        category: input.category,
        direction: input.direction,
        amountCents: Math.round(amountNumber * 100),
        defaultNote: input.defaultNote ? input.defaultNote : undefined,
        dayOfMonth: input.dayOfMonth ? Number(input.dayOfMonth) : undefined
      });
    },
    onSuccess: (template) => {
      invalidateTemplates();
      closeTemplateDialog();
      handleMutationSuccess('Template saved.', {
        event: 'finance.template.created',
        payload: { templateId: template.id, category: template.category }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to save template.', setTemplateError)
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (payload: { template: SerializedCashflowTemplate; form: TemplateFormState }) => {
      const amountNumber = Number(payload.form.amount);
      return patchJson<SerializedCashflowTemplate>(`/api/finance/cashflow/templates/${payload.template.id}`, {
        name: payload.form.name,
        category: payload.form.category,
        direction: payload.form.direction,
        amountCents: Math.round(amountNumber * 100),
        defaultNote: payload.form.defaultNote ? payload.form.defaultNote : null,
        dayOfMonth: payload.form.dayOfMonth ? Number(payload.form.dayOfMonth) : null
      });
    },
    onSuccess: (template) => {
      invalidateTemplates();
      closeTemplateDialog();
      handleMutationSuccess('Template updated.', {
        event: 'finance.template.updated',
        payload: { templateId: template.id, category: template.category }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to update template.', setTemplateError)
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => deleteRequest(`/api/finance/cashflow/templates/${templateId}`),
    onSuccess: (_, templateId) => {
      invalidateTemplates();
      closeTemplateDialog();
      handleMutationSuccess('Template removed.', {
        event: 'finance.template.deleted',
        payload: { templateId }
      });
    },
    onError: (error: Error) => handleMutationFailure(error, 'Failed to delete template.', setTemplateError)
  });

  const handleTemplateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTemplateError(null);
    setTemplateFieldErrors({});

    const errors: TemplateFieldErrors = {};
    const amountTrimmed = templateForm.amount.trim();

    if (!templateForm.name.trim()) {
      errors.name = 'Name is required.';
    }

    if (!templateForm.category.trim()) {
      errors.category = 'Category is required.';
    }

    if (!amountTrimmed) {
      errors.amount = 'Amount is required.';
    } else if (Number.isNaN(Number(amountTrimmed))) {
      errors.amount = 'Amount must be a number.';
    }

    if (Object.keys(errors).length > 0) {
      setTemplateFieldErrors(errors);
      setTemplateError('Please fix the highlighted fields.');
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ template: editingTemplate, form: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handleTemplateDelete = () => {
    if (!editingTemplate) return;
    deleteTemplateMutation.mutate(editingTemplate.id);
  };

  const isTemplateSaving = createTemplateMutation.isPending || updateTemplateMutation.isPending;
  const isTemplateDeleting = deleteTemplateMutation.isPending;

  const applyTemplateToCashflow = (template: SerializedCashflowTemplate) => {
    setCashflowForm((state) => ({
      ...state,
      description: template.name,
      category: template.category,
      amount: (template.amountCents / 100).toString(),
      direction: template.direction,
      note: template.defaultNote ?? ''
    }));
    showToast({ description: 'Template applied to transaction form.', variant: 'warning' });
  };

  const handleBudgetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBudgetError(null);
    setBudgetFieldErrors({});

    const errors: BudgetFieldErrors = {};
    const targetTrimmed = budgetForm.target.trim();

    if (!budgetForm.name.trim()) {
      errors.name = 'Name is required.';
    }

    if (!budgetForm.category.trim()) {
      errors.category = 'Category is required.';
    }

    if (!targetTrimmed) {
      errors.target = 'Target amount is required.';
    } else if (Number.isNaN(Number(targetTrimmed))) {
      errors.target = 'Target must be a number.';
    }

    if (Object.keys(errors).length > 0) {
      setBudgetFieldErrors(errors);
      setBudgetError('Please fix the highlighted fields.');
      return;
    }

    if (editingBudget) {
      updateBudgetMutation.mutate({ budget: editingBudget, form: budgetForm });
    } else {
      createBudgetMutation.mutate(budgetForm);
    }
  };

  const handleBudgetDelete = () => {
    if (!editingBudget) return;
    deleteBudgetMutation.mutate(editingBudget.id);
  };

  const isBudgetSaving = createBudgetMutation.isPending || updateBudgetMutation.isPending;
  const isBudgetDeleting = deleteBudgetMutation.isPending;

  const kpIs = useMemo<KpiCard[]>(
    () => [
      {
        label: 'Net Worth',
        value: centsToCurrency(summary.netWorthCents, currency),
        helper: `Assets ${centsToCurrency(totals.assetsCents, currency)} – Liabilities ${centsToCurrency(
          totals.liabilitiesCents,
          currency
        )}`
      },
      {
        label: 'Liquid Net Worth',
        value: centsToCurrency(summary.liquidNetCents, currency),
        helper: `${numberFormatter.format(totals.windowDays)}d liquid runway`
      },
      {
        label: 'Cash on Hand',
        value: centsToCurrency(summary.cashOnHandCents, currency),
        helper: totals.monthlyBurnCents
          ? `${centsToCurrency(totals.monthlyBurnCents, currency)} / month burn`
          : 'No burn recorded yet'
      },
      {
        label: 'Runway',
        value: summary.runwayMonths != null ? `${summary.runwayMonths.toFixed(1)} months` : '—',
        helper: summary.runwayMonths != null ? 'Runway based on 30d cashflow window' : 'Log outflows to estimate runway'
      },
      {
        label: 'DSCR',
        value: summary.dscr != null ? summary.dscr.toFixed(2) : '—',
        helper: summary.dscr != null ? 'Target ≥ 1.25 for healthy coverage' : 'Add income & debt payments to see DSCR'
      },
      {
        label: 'Debt Utilization',
        value: summary.debtUtilization != null ? percentFormatter.format(summary.debtUtilization) : '—',
        helper: summary.debtUtilization != null ? 'Liabilities / Assets' : 'Add assets & liabilities to compute utilization'
      }
    ],
    [currency, summary, totals]
  );

  return (
    <div className="space-y-6">
      <section>
        {summaryQuery.isError && (
          <div className="mb-3 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Unable to refresh KPIs: {getErrorMessage(summaryQuery.error)}</span>
              <button
                type="button"
                onClick={() => summaryQuery.refetch()}
                className="rounded-md border border-rose-300/60 px-3 py-1 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/20"
              >
                Retry
              </button>
            </div>
          </div>
        )}

      {templateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-surface p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold text-white">{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
              <p className="text-xs text-slate-400">Pre-fill recurring transactions and apply them quickly.</p>
            </div>
            {templateError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{templateError}</div>
            )}
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Name</label>
                <input
                  value={templateForm.name}
                  onChange={(event) => setTemplateForm((state) => ({ ...state, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Rent"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Category</label>
                <input
                  value={templateForm.category}
                  onChange={(event) => setTemplateForm((state) => ({ ...state, category: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Housing"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Direction</label>
                  <select
                    value={templateForm.direction}
                    onChange={(event) =>
                      setTemplateForm((state) => ({ ...state, direction: event.target.value as TemplateFormState['direction'] }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  >
                    <option value="outflow">Outflow</option>
                    <option value="inflow">Inflow</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={templateForm.amount}
                    onChange={(event) => setTemplateForm((state) => ({ ...state, amount: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Default Note</label>
                  <textarea
                    value={templateForm.defaultNote}
                    onChange={(event) => setTemplateForm((state) => ({ ...state, defaultNote: event.target.value }))}
                    className="h-full min-h-[80px] w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="Optional context"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={templateForm.dayOfMonth}
                    onChange={(event) => setTemplateForm((state) => ({ ...state, dayOfMonth: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {editingTemplate && (
                  <button
                    type="button"
                    onClick={handleTemplateDelete}
                    disabled={isTemplateDeleting}
                    className="mr-auto text-sm text-rose-400 transition hover:text-rose-300 disabled:opacity-60"
                  >
                    {isTemplateDeleting ? 'Deleting…' : 'Delete template'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeTemplateDialog}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTemplateSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-70"
                >
                  {isTemplateSaving ? 'Saving…' : editingTemplate ? 'Save changes' : 'Add template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        <div className="grid gap-4 md:grid-cols-3">
          {kpIs.map((item: KpiCard) => (
            <MetricCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-surface/70 p-5">
        <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Recurring Templates</h2>
            <p className="text-xs text-slate-400">Save frequent transactions and apply them quickly.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{templates?.length ?? 0} templates</span>
            <button
              onClick={openCreateTemplate}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:border-primary hover:text-primary"
            >
              New Template
            </button>
          </div>
        </header>
        {templatesQuery.isError && (
          <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Failed to load templates: {getErrorMessage(templatesQuery.error)}</span>
              <button
                type="button"
                onClick={() => templatesQuery.refetch()}
                className="rounded-md border border-rose-300/50 px-2 py-1 text-[11px] font-semibold text-rose-50 transition hover:bg-rose-400/20"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Direction</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Default Note</th>
                <th className="py-2 pr-4">Day</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(templates ?? []).map((template) => (
                <tr key={template.id} className="hover:bg-slate-800/40">
                  <td className="py-2 pr-4 font-medium text-white">{template.name}</td>
                  <td className="py-2 pr-4 text-slate-300">{template.category}</td>
                  <td className="py-2 pr-4 capitalize text-slate-400">{template.direction}</td>
                  <td className="py-2 pr-4 text-right text-slate-100">{centsToCurrency(template.amountCents, currency)}</td>
                  <td className="py-2 pr-4 text-slate-400">{template.defaultNote ?? '—'}</td>
                  <td className="py-2 pr-4 text-slate-400">{template.dayOfMonth ?? '—'}</td>
                  <td className="py-2 text-right text-xs">
                    <button
                      onClick={() => applyTemplateToCashflow(template)}
                      className="mr-3 text-sky-300 transition hover:text-sky-200"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => openEditTemplate(template)}
                      className="mr-3 text-emerald-300 transition hover:text-emerald-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setTemplateForm({
                          name: template.name,
                          category: template.category,
                          direction: template.direction,
                          amount: (template.amountCents / 100).toString(),
                          defaultNote: template.defaultNote ?? '',
                          dayOfMonth: template.dayOfMonth != null ? template.dayOfMonth.toString() : ''
                        });
                        setTemplateDialogOpen(true);
                      }}
                      className="text-rose-400 transition hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {(templates?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                    No templates yet. Save recurring transactions to reuse them later.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-surface/70 p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Assets</h2>
              <p className="text-xs text-slate-400">Tracked holdings and their latest values.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{assets?.length ?? 0} items</span>
              <button
                onClick={openCreateAsset}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:border-primary hover:text-primary"
              >
                Add Asset
              </button>
            </div>
          </header>
          {assetsQuery.isError && (
            <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Failed to load assets: {getErrorMessage(assetsQuery.error)}</span>
                <button
                  type="button"
                  onClick={() => assetsQuery.refetch()}
                  className="rounded-md border border-rose-300/50 px-2 py-1 text-[11px] font-semibold text-rose-50 transition hover:bg-rose-400/20"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4 text-right">Value</th>
                  <th className="py-2 pr-4 text-center">Liquid</th>
                  <th className="py-2">Updated</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assets?.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/40">
                    <td className="py-2 pr-4 font-medium text-white">{asset.name}</td>
                    <td className="py-2 pr-4 text-slate-300">{asset.category}</td>
                    <td className="py-2 pr-4 text-right font-medium text-emerald-300">
                      {centsToCurrency(asset.valueCents, currency)}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {asset.isLiquid ? <span className="text-emerald-300">Yes</span> : <span className="text-slate-500">No</span>}
                    </td>
                    <td className="py-2 pr-4 text-slate-400">{new Date(asset.updatedAt).toLocaleDateString()}</td>
                    <td className="py-2 text-right text-xs">
                      <button
                        onClick={() => openEditAsset(asset)}
                        className="mr-3 text-emerald-300 transition hover:text-emerald-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setEditingAsset(asset);
                          setAssetForm({
                            name: asset.name,
                            category: asset.category,
                            value: (asset.valueCents / 100).toString(),
                            isLiquid: asset.isLiquid,
                            note: asset.note ?? ''
                          });
                          setAssetDialogOpen(true);
                        }}
                        className="text-rose-400 transition hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {(assets?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                      No assets tracked yet. Add your first asset to see it here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-surface/70 p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Liabilities</h2>
              <p className="text-xs text-slate-400">Monitor outstanding balances and required payments.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{liabilities?.length ?? 0} items</span>
              <button
                onClick={openCreateLiability}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:border-primary hover:text-primary"
              >
                Add Liability
              </button>
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4 text-right">Balance</th>
                  <th className="py-2 pr-4 text-right">APR</th>
                  <th className="py-2 pr-4 text-right">Min Payment</th>
                  <th className="py-2">Updated</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {liabilities?.map((liability) => (
                  <tr key={liability.id} className="hover:bg-slate-800/40">
                    <td className="py-2 pr-4 font-medium text-white">{liability.name}</td>
                    <td className="py-2 pr-4 text-slate-300">{liability.category}</td>
                    <td className="py-2 pr-4 text-right font-medium text-rose-300">
                      {centsToCurrency(liability.balanceCents, currency)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {liability.aprPercent != null ? `${liability.aprPercent.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {liability.minimumPayment != null
                        ? centsToCurrency(liability.minimumPayment, currency)
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 text-slate-400">{new Date(liability.updatedAt).toLocaleDateString()}</td>
                    <td className="py-2 text-right text-xs">
                      <button
                        onClick={() => openEditLiability(liability)}
                        className="mr-3 text-emerald-300 transition hover:text-emerald-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setEditingLiability(liability);
                          setLiabilityForm({
                            name: liability.name,
                            category: liability.category,
                            balance: (liability.balanceCents / 100).toString(),
                            aprPercent: liability.aprPercent != null ? liability.aprPercent.toString() : '',
                            minimumPayment:
                              liability.minimumPayment != null
                                ? (liability.minimumPayment / 100).toString()
                                : '',
                            note: liability.note ?? ''
                          });
                          setLiabilityDialogOpen(true);
                        }}
                        className="text-rose-400 transition hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {(liabilities?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                      No liabilities tracked yet. Add credit lines, loans, or payables.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-surface/70 p-5">
        <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Cashflow (last 100)</h2>
            <p className="text-xs text-slate-400">Track inflows versus outflows to understand burn.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>Inflow: {centsToCurrency(totals.inflowCents, currency)}</span>
            <span>Outflow: {centsToCurrency(totals.outflowCents, currency)}</span>
            <span>Burn (30d avg): {centsToCurrency(totals.monthlyBurnCents, currency)}</span>
            <button
              onClick={() => exportCashflowCsv(filteredCashflow, currency)}
              disabled={filteredCashflow.length === 0}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:border-primary hover:text-primary disabled:opacity-60"
            >
              Export CSV
            </button>
            <button
              onClick={openCreateCashflow}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:border-primary hover:text-primary"
            >
              Log Transaction
            </button>
          </div>
        </header>
        <div className="mb-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Direction</span>
            <select
              value={cashflowFilters.direction}
              onChange={(event) =>
                setCashflowFilters((state) => ({ ...state, direction: event.target.value as CashflowFilters['direction'] }))
              }
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="all">All</option>
              <option value="inflow">Inflow</option>
              <option value="outflow">Outflow</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Category</span>
            <select
              value={cashflowFilters.category}
              onChange={(event) => setCashflowFilters((state) => ({ ...state, category: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="all">All</option>
              {uniqueCashflowCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Start</span>
            <input
              type="date"
              value={cashflowFilters.startDate}
              onChange={(event) => setCashflowFilters((state) => ({ ...state, startDate: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">End</span>
            <input
              type="date"
              value={cashflowFilters.endDate}
              onChange={(event) => setCashflowFilters((state) => ({ ...state, endDate: event.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Search</span>
            <input
              type="text"
              value={cashflowFilters.search}
              onChange={(event) => setCashflowFilters((state) => ({ ...state, search: event.target.value }))}
              placeholder="Search description, category, or notes"
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </label>
          <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Showing {filteredCashflow.length} of {cashflow?.length ?? 0} transactions
            </p>
            <button
              type="button"
              onClick={() => setCashflowFilters(defaultCashflowFilters)}
              disabled={JSON.stringify(cashflowFilters) === JSON.stringify(defaultCashflowFilters)}
              className="text-[11px] font-semibold text-slate-300 transition hover:text-white disabled:opacity-40"
            >
              Reset filters
            </button>
          </div>
        </div>
        {cashflowQuery.isError && (
          <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Failed to load cashflow: {getErrorMessage(cashflowQuery.error)}</span>
              <button
                type="button"
                onClick={() => cashflowQuery.refetch()}
                className="rounded-md border border-rose-300/50 px-2 py-1 text-[11px] font-semibold text-rose-50 transition hover:bg-rose-400/20"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2">Direction</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCashflow.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-800/40">
                  <td className="py-2 pr-4 text-slate-400">{new Date(txn.date).toLocaleDateString()}</td>
                  <td className="py-2 pr-4 font-medium text-white">{txn.description}</td>
                  <td className="py-2 pr-4 text-slate-300">{txn.category}</td>
                  <td
                    className={`py-2 pr-4 text-right font-medium ${
                      txn.direction === 'inflow' ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {centsToCurrency(txn.amountCents, currency)}
                  </td>
                  <td className="py-2 pr-4 capitalize text-slate-400">{txn.direction}</td>
                  <td className="py-2 text-right text-xs">
                    <button
                      onClick={() => openEditCashflow(txn)}
                      className="mr-3 text-emerald-300 transition hover:text-emerald-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setEditingCashflow(txn);
                        setCashflowForm({
                          description: txn.description,
                          category: txn.category,
                          amount: (txn.amountCents / 100).toString(),
                          direction: txn.direction,
                          date: txn.date.slice(0, 10),
                          note: txn.note ?? ''
                        });
                        setCashflowDialogOpen(true);
                      }}
                      className="text-rose-400 transition hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {(cashflow?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    No cashflow transactions recorded yet. Log inflows and outflows to see trends.
                  </td>
                </tr>
              )}
              {cashflow && cashflow.length > 0 && filteredCashflow.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    No transactions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-surface/70 p-5">
        <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Budget Envelopes</h2>
            <p className="text-xs text-slate-400">Track category targets and watch real-time variance.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{budgets?.length ?? 0} active</span>
            <button
              onClick={openCreateBudget}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-white transition hover:border-primary hover:text-primary"
            >
              New Envelope
            </button>
          </div>
        </header>
        {budgetsQuery.isError && (
          <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Failed to load budgets: {getErrorMessage(budgetsQuery.error)}</span>
              <button
                type="button"
                onClick={() => budgetsQuery.refetch()}
                className="rounded-md border border-rose-300/50 px-2 py-1 text-[11px] font-semibold text-rose-50 transition hover:bg-rose-400/20"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Period</th>
                <th className="py-2 pr-4 text-right">Target</th>
                <th className="py-2 pr-4 text-right">Spent</th>
                <th className="py-2 pr-4 text-right">Remaining</th>
                <th className="py-2 pr-4 text-right">Variance</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(budgets ?? []).map((budget) => {
                const variancePercent = budget.variancePercent ?? 0;
                const varianceColor = variancePercent > 0 ? 'text-rose-300' : variancePercent < 0 ? 'text-emerald-300' : 'text-slate-300';
                return (
                  <tr key={budget.id} className="hover:bg-slate-800/40">
                    <td className="py-2 pr-4 font-medium text-white">{budget.name}</td>
                    <td className="py-2 pr-4 text-slate-300">{budget.category}</td>
                    <td className="py-2 pr-4 capitalize text-slate-400">{budget.period}</td>
                    <td className="py-2 pr-4 text-right text-slate-100">{centsToCurrency(budget.targetCents, currency)}</td>
                    <td className="py-2 pr-4 text-right text-rose-200">{centsToCurrency(budget.actualSpentCents, currency)}</td>
                    <td className={`py-2 pr-4 text-right ${budget.remainingCents < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {centsToCurrency(budget.remainingCents, currency)}
                    </td>
                    <td className={`py-2 pr-4 text-right ${varianceColor}`}>
                      {budget.variancePercent != null ? `${(variancePercent * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="py-2 text-right text-xs">
                      <button
                        onClick={() => openEditBudget(budget)}
                        className="mr-3 text-emerald-300 transition hover:text-emerald-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setEditingBudget(budget);
                          setBudgetForm({
                            name: budget.name,
                            category: budget.category,
                            period: budget.period,
                            target: (budget.targetCents / 100).toString(),
                            note: budget.note ?? ''
                          });
                          setBudgetDialogOpen(true);
                        }}
                        className="text-rose-400 transition hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(budgets?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-slate-500">
                    No envelopes yet. Create budgets to cap spending per category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {assetDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-surface p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {editingAsset ? 'Edit Asset' : 'Add Asset'}
              </h3>
              <p className="text-xs text-slate-400">Values are entered in whole currency amounts.</p>
            </div>
            {assetError && <div className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{assetError}</div>}
            <form onSubmit={handleAssetSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Name</label>
                <input
                  value={assetForm.name}
                  onChange={(event) => setAssetForm((state) => ({ ...state, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Brokerage Account"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Category</label>
                <input
                  value={assetForm.category}
                  onChange={(event) => setAssetForm((state) => ({ ...state, category: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Investments"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Value ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={assetForm.value}
                    onChange={(event) => setAssetForm((state) => ({ ...state, value: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input
                    id="asset-liquid"
                    type="checkbox"
                    checked={assetForm.isLiquid}
                    onChange={(event) => setAssetForm((state) => ({ ...state, isLiquid: event.target.checked }))}
                    className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-primary focus:ring-primary"
                  />
                  <label htmlFor="asset-liquid" className="text-sm text-slate-200">
                    Liquid asset
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Note</label>
                <textarea
                  value={assetForm.note}
                  onChange={(event) => setAssetForm((state) => ({ ...state, note: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  rows={3}
                  placeholder="Optional context or account number"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {editingAsset && (
                  <button
                    type="button"
                    onClick={handleAssetDelete}
                    disabled={isDeleting}
                    className="mr-auto text-sm text-rose-400 transition hover:text-rose-300 disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete asset'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeAssetDialog}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-70"
                >
                  {isSaving ? 'Saving…' : editingAsset ? 'Save changes' : 'Add asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {budgetDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-surface p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold text-white">{editingBudget ? 'Edit Budget Envelope' : 'Add Budget Envelope'}</h3>
              <p className="text-xs text-slate-400">Set a target per period to keep spending in check.</p>
            </div>
            {budgetError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{budgetError}</div>
            )}
            <form onSubmit={handleBudgetSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Name</label>
                <input
                  value={budgetForm.name}
                  onChange={(event) => setBudgetForm((state) => ({ ...state, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Household"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Category</label>
                <input
                  value={budgetForm.category}
                  onChange={(event) => setBudgetForm((state) => ({ ...state, category: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Groceries"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Period</label>
                  <select
                    value={budgetForm.period}
                    onChange={(event) =>
                      setBudgetForm((state) => ({ ...state, period: event.target.value as BudgetFormState['period'] }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Target ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={budgetForm.target}
                    onChange={(event) => setBudgetForm((state) => ({ ...state, target: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Note</label>
                <textarea
                  value={budgetForm.note}
                  onChange={(event) => setBudgetForm((state) => ({ ...state, note: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  rows={3}
                  placeholder="Optional context"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {editingBudget && (
                  <button
                    type="button"
                    onClick={handleBudgetDelete}
                    disabled={isBudgetDeleting}
                    className="mr-auto text-sm text-rose-400 transition hover:text-rose-300 disabled:opacity-60"
                  >
                    {isBudgetDeleting ? 'Deleting…' : 'Delete budget'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeBudgetDialog}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBudgetSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-70"
                >
                  {isBudgetSaving ? 'Saving…' : editingBudget ? 'Save changes' : 'Add budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {liabilityDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-surface p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {editingLiability ? 'Edit Liability' : 'Add Liability'}
              </h3>
              <p className="text-xs text-slate-400">Enter balance and payments in whole currency amounts.</p>
            </div>
            {liabilityError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                {liabilityError}
              </div>
            )}
            <form onSubmit={handleLiabilitySubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Name</label>
                <input
                  value={liabilityForm.name}
                  onChange={(event) => setLiabilityForm((state) => ({ ...state, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Mortgage"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Category</label>
                <input
                  value={liabilityForm.category}
                  onChange={(event) => setLiabilityForm((state) => ({ ...state, category: event.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Real Estate"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Balance ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={liabilityForm.balance}
                    onChange={(event) => setLiabilityForm((state) => ({ ...state, balance: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">APR %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={liabilityForm.aprPercent}
                    onChange={(event) => setLiabilityForm((state) => ({ ...state, aprPercent: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="3.5"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Minimum Payment ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={liabilityForm.minimumPayment}
                    onChange={(event) =>
                      setLiabilityForm((state) => ({ ...state, minimumPayment: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="1200.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Note</label>
                  <textarea
                    value={liabilityForm.note}
                    onChange={(event) => setLiabilityForm((state) => ({ ...state, note: event.target.value }))}
                    className="h-full min-h-[80px] w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="Optional details"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {editingLiability && (
                  <button
                    type="button"
                    onClick={handleLiabilityDelete}
                    disabled={isLiabilityDeleting}
                    className="mr-auto text-sm text-rose-400 transition hover:text-rose-300 disabled:opacity-60"
                  >
                    {isLiabilityDeleting ? 'Deleting…' : 'Delete liability'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeLiabilityDialog}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLiabilitySaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-70"
                >
                  {isLiabilitySaving ? 'Saving…' : editingLiability ? 'Save changes' : 'Add liability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cashflowDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-surface p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {editingCashflow ? 'Edit Transaction' : 'Log Transaction'}
              </h3>
              <p className="text-xs text-slate-400">Track income and expenses to keep your burn in check.</p>
            </div>
            {cashflowError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                {cashflowError}
              </div>
            )}
            <form onSubmit={handleCashflowSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Description</label>
                <input
                  value={cashflowForm.description}
                  onChange={(event) =>
                    setCashflowForm((state) => ({ ...state, description: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Consulting Invoice"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Category</label>
                <input
                  value={cashflowForm.category}
                  onChange={(event) =>
                    setCashflowForm((state) => ({ ...state, category: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Income"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashflowForm.amount}
                    onChange={(event) =>
                      setCashflowForm((state) => ({ ...state, amount: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Direction</label>
                  <select
                    value={cashflowForm.direction}
                    onChange={(event) =>
                      setCashflowForm((state) => ({
                        ...state,
                        direction: event.target.value as CashflowFormState['direction']
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  >
                    <option value="inflow">Inflow</option>
                    <option value="outflow">Outflow</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Date</label>
                  <input
                    type="date"
                    value={cashflowForm.date}
                    onChange={(event) =>
                      setCashflowForm((state) => ({ ...state, date: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Note</label>
                  <textarea
                    value={cashflowForm.note}
                    onChange={(event) =>
                      setCashflowForm((state) => ({ ...state, note: event.target.value }))
                    }
                    className="h-full min-h-[80px] w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="Optional context"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {editingCashflow && (
                  <button
                    type="button"
                    onClick={handleCashflowDelete}
                    disabled={isCashflowDeleting}
                    className="mr-auto text-sm text-rose-400 transition hover:text-rose-300 disabled:opacity-60"
                  >
                    {isCashflowDeleting ? 'Deleting…' : 'Delete transaction'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeCashflowDialog}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCashflowSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-70"
                >
                  {isCashflowSaving ? 'Saving…' : editingCashflow ? 'Save changes' : 'Log transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
