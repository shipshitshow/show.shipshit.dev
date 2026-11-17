'use client';

import type { Lead, LeadListResponse, LeadStatus } from '@shipshitshow/types';
import { UNATTRIBUTED_EPISODE } from '@shipshitshow/types';
import { Button } from '@shipshitshow/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJson } from '@/lib/fetch-json';
import { LeadLogTable } from './LeadLogTable';
import { LeadQuickForm } from './LeadQuickForm';

const EPISODE_SUMMARY_LIMIT = 6;
const LEADS_KEY = ['leads'];

export function LeadsView() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryFn: ({ signal }) =>
      fetchJson<LeadListResponse>('/api/leads', 'Failed to load leads', signal),
    queryKey: LEADS_KEY,
  });
  const leads = query.data?.leads ?? [];
  const episodes = query.data?.episodes ?? [];
  const leadsByEpisode = query.data?.leadsByEpisode ?? {};
  const loading = query.isPending;
  const error = query.error?.message ?? null;
  const fetchLeads = () => query.refetch();

  function updateLeads(update: (data: LeadListResponse) => LeadListResponse) {
    queryClient.setQueryData<LeadListResponse>(LEADS_KEY, (data) =>
      data ? update(data) : data,
    );
  }

  function handleCreated(lead: Lead) {
    updateLeads((data) => {
      const key = lead.episodeDate ?? UNATTRIBUTED_EPISODE;
      return {
        ...data,
        leads: [lead, ...data.leads],
        leadsByEpisode: {
          ...data.leadsByEpisode,
          [key]: (data.leadsByEpisode[key] ?? 0) + 1,
        },
      };
    });
  }

  async function handleStatusChange(lead: Lead, status: LeadStatus) {
    updateLeads((data) => ({
      ...data,
      leads: data.leads.map((item) =>
        item.id === lead.id ? { ...item, status } : item,
      ),
    }));

    const res = await fetch(`/api/leads/${encodeURIComponent(lead.id)}`, {
      body: JSON.stringify({ status }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });

    if (!res.ok) {
      updateLeads((data) => ({
        ...data,
        leads: data.leads.map((item) =>
          item.id === lead.id ? { ...item, status: lead.status } : item,
        ),
      }));
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Loading leads…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="text-4xl text-accent-red">!</div>
        <p className="text-sm text-text-secondary">{error}</p>
        <Button
          onClick={fetchLeads}
          className="text-xs hover:border-accent-red"
        >
          Retry
        </Button>
      </div>
    );
  }

  const attributedEpisodes = episodes
    .filter((episode) => leadsByEpisode[episode.date])
    .slice(0, EPISODE_SUMMARY_LIMIT);
  const unattributedCount = leadsByEpisode[UNATTRIBUTED_EPISODE] ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
        <div>
          <p className="text-sm font-medium text-text-primary">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'} logged
          </p>
          <p className="mt-1 text-[11px] text-text-muted">
            Leads per episode is the north-star metric — log every inbound.
          </p>
        </div>
        <Button
          onClick={fetchLeads}
          className="h-8 text-xs text-text-secondary"
        >
          Refresh
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
        <LeadQuickForm episodes={episodes} onCreated={handleCreated} />

        {(attributedEpisodes.length > 0 || unattributedCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {attributedEpisodes.map((episode) => (
              <span
                key={episode.date}
                className="rounded-md border border-surface-border bg-surface-card px-2.5 py-1 text-[11px] text-text-secondary"
              >
                {episode.date}
                <span className="ml-1.5 font-medium text-accent-red">
                  {leadsByEpisode[episode.date]}
                </span>
              </span>
            ))}
            {unattributedCount > 0 && (
              <span className="rounded-md border border-surface-border bg-surface-card px-2.5 py-1 text-[11px] text-text-muted">
                Unattributed
                <span className="ml-1.5 font-medium">{unattributedCount}</span>
              </span>
            )}
          </div>
        )}

        <LeadLogTable leads={leads} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}
