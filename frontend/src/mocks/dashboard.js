export const MOCK_DASHBOARD = {
  pipeline: {
    total: 257850000,
    weighted: 184500000,
    count: 24
  },
  overdue: {
    amt: 4500000,
    count: 3
  },
  openTasks: {
    cnt: 12
  },
  activitiesToday: {
    cnt: 4
  },
  recentActivities: [
    { id: 1, subject: 'Strategic Planning Session', activity_type: 'Meeting', activity_date: '2024-05-06T10:00:00Z', related_name: 'AI Center of Excellence' },
    { id: 2, subject: 'Price Negotiation Call', activity_type: 'Call', activity_date: '2024-05-06T14:30:00Z', related_name: 'Digital Banking Revamp' },
    { id: 3, subject: 'Product Demo', activity_type: 'Meeting', activity_date: '2024-05-05T11:00:00Z', related_name: 'Cybersecurity Suite' }
  ],
  funnel: [
    { stage: 'Discovery', count: 8, value: 125000000 },
    { stage: 'Proposal', count: 6, value: 45000000 },
    { stage: 'Negotiation', count: 4, value: 65000000 },
    { stage: 'Closed Won', count: 6, value: 22850000 }
  ]
};
