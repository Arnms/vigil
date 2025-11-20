import { Incident } from '../../types/incident';

export const mockIncidents: Incident[] = [
  {
    id: '1',
    endpointId: '1',
    endpointName: 'API Server',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    resolvedAt: new Date(Date.now() - 1800000).toISOString(),
    failureCount: 3,
    errorMessage: 'Connection timeout',
    status: 'RESOLVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    endpointId: '2',
    endpointName: 'Database API',
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    resolvedAt: null,
    failureCount: 5,
    errorMessage: 'High response time',
    status: 'ONGOING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockIncident: Incident = mockIncidents[0];
