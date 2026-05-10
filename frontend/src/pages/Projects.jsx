
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlideOver from '../components/ui/SlideOver';
import ProjectForm from '../features/projects/ProjectForm';
import { formatCurrency, formatDate, formatLabel } from '../lib/formatters';

export default function Projects() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    health: '',
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const {
    data: projects = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v)
        )
      );

      const { data } = await apiClient.get(`/projects?${params}`);

      return data;
    },
  });

  const handleEdit = (p) => {
    setSelectedProject(p);
    setIsDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedProject(null);
    setIsDrawerOpen(true);
  };

  const handleSuccess = async () => {
    setIsDrawerOpen(false);

    await queryClient.invalidateQueries({
      queryKey: ['projects'],
    });
  };

  if (isError) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500">
          Error loading projects. Please check your connection.
        </p>

        <Button
          variant="ghost"
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  const getHealthColor = (health) => {
    switch (health) {
      case 'On Track':
        return 'bg-green-500';

      case 'At Risk':
        return 'bg-yellow-500';

      case 'Off Track':
        return 'bg-red-500';

      case 'Completed':
        return 'bg-blue-500';

      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
            Projects
          </h1>

          <p className="text-[13px] text-[var(--color-text-muted)]">
            Track delivery, milestones, and project financials
          </p>
        </div>

        <Button variant="primary" onClick={handleCreate}>
          + New Project
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            placeholder="Search projects..."
            className="w-full bg-white border border-[var(--color-border)] rounded-xl pl-9 pr-4 py-2 text-[13px] outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm"
            value={filters.search}
            onChange={(e) =>
              setFilters((p) => ({
                ...p,
                search: e.target.value,
              }))
            }
          />
        </div>

        <select
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm"
          value={filters.status}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              status: e.target.value,
            }))
          }
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="In Progress">In Progress</option>
          <option value="On Hold">On Hold</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-[13px] outline-none min-w-[150px] shadow-sm"
          value={filters.health}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              health: e.target.value,
            }))
          }
        >
          <option value="">All Health</option>
          <option value="On Track">On Track</option>
          <option value="At Risk">At Risk</option>
          <option value="Off Track">Off Track</option>
        </select>
      </div>

      {/* Project Grid */}
      <div className="flex-1 overflow-auto pb-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[280px] bg-gray-100 rounded-2xl"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => handleEdit(p)}
                className="group bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${getHealthColor(
                          p.health
                        )}`}
                      />

                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {p.project_id}
                      </span>
                    </div>

                    <h3 className="font-semibold text-[15px] text-[var(--color-text-primary)] group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {p.project_name}
                    </h3>

                    <p className="text-[12px] text-gray-500 font-medium">
                      @{p.account_name}
                    </p>
                  </div>

                  <Badge label={p.status} />
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-medium text-gray-400 uppercase">
                      Overall Progress
                    </span>

                    <span className="text-[12px] font-bold text-indigo-600">
                      {p.pct_complete || 0}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${p.pct_complete || 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="grid grid-cols-3 gap-2 mb-6 p-3 bg-gray-50 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 uppercase font-bold">
                      Contract
                    </span>

                    <span className="text-[12px] font-semibold">
                      ₹
                      {formatCurrency(p.contract_value).replace('₹', '')}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 uppercase font-bold">
                      Invoiced
                    </span>

                    <span className="text-[12px] font-semibold text-gray-600">
                      ₹{formatCurrency(p.invoiced).replace('₹', '')}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 uppercase font-bold">
                      Pending
                    </span>

                    <span className="text-[12px] font-semibold text-red-500">
                      ₹{formatCurrency(p.pending).replace('₹', '')}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">
                      Next Milestone:
                    </span>

                    <span className="font-semibold text-gray-700">
                      {p.next_milestone || 'Not Defined'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                        {p.pm_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('') || 'PM'}
                      </div>

                      <span className="text-[11px] font-medium text-gray-600">
                        {p.pm_name || 'Unassigned'}
                      </span>
                    </div>

                    <span className="text-[11px] text-gray-400">
                      {formatDate(p.end_date)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <SlideOver
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          selectedProject
            ? 'Manage Delivery'
            : 'Launch New Project'
        }
      >
        <ProjectForm
          key={selectedProject?.id || 'new'}
          initialData={selectedProject}
          onSuccess={handleSuccess}
          onCancel={() => setIsDrawerOpen(false)}
        />
      </SlideOver>
    </div>
  );
}

