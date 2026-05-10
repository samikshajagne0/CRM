import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import { formatDate, formatTime } from '../../lib/formatters';

export default function ActivityTimeline({ activities = [] }) {
  if (!activities || activities.length === 0) {
    return <div className="p-4 text-center text-[12px] text-gray-400 italic">No activity history found.</div>;
  }

  return (
    <div className="p-4 bg-gray-50/50 rounded-xl border border-[var(--color-border-light)]">
      <div className="space-y-4">
        {activities.map((act, idx) => (
          <div key={act.id} className="relative pl-6 pb-1 last:pb-0">
            {/* Timeline line */}
            {idx !== activities.length - 1 && (
              <div className="absolute left-[7px] top-[22px] bottom-[-18px] w-[2px] bg-gray-200" />
            )}
            {/* Timeline dot */}
            <div className="absolute left-0 top-[6px] w-4 h-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm" />
            
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{act.subject}</span>
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                  {formatDate(act.date)} at {formatTime(act.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium uppercase tracking-wide">
                  {act.type}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">by {act.owner_name}</span>
              </div>
              {act.outcome && (
                <p className="text-[12px] text-[var(--color-text-secondary)] mt-2 bg-white p-2 rounded-lg border border-[var(--color-border-light)] shadow-sm">
                  {act.outcome}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
