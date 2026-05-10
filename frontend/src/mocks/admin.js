export const MOCK_ADMIN_STATS = {
  totalUsers: 15,
  activeSessions: 4,
  errorRate: '0.02%',
  avgResponseTime: '120ms'
};

export const MOCK_USERS = [
  { id: 1, name: 'Samiksha Jagne', email: 'samiksha.jagne@astura.ai', role: 'admin', active: true },
  { id: 2, name: 'Rahul Sharma', email: 'rahul.sharma@astura.ai', role: 'manager', active: true },
  { id: 3, name: 'Anita Desai', email: 'anita.desai@nexuscorp.com', role: 'user', active: true }
];

export const MOCK_AUDIT_LOGS = [
  { id: 1, action: 'LOGIN', module: 'AUTH', user_name: 'Samiksha Jagne', created_at: '2024-05-06T10:00:00Z' },
  { id: 2, action: 'UPDATE', module: 'ACCOUNTS', user_name: 'Rahul Sharma', created_at: '2024-05-06T11:30:00Z' },
  { id: 3, action: 'CREATE', module: 'OPPORTUNITIES', user_name: 'Anita Desai', created_at: '2024-05-06T12:15:00Z' }
];
