import { DataSource } from 'typeorm';
import { Endpoint, HttpMethod, EndpointStatus } from '../../modules/endpoint/endpoint.entity';

export async function seedEndpoints(dataSource: DataSource): Promise<void> {
  const endpointRepository = dataSource.getRepository(Endpoint);

  // Check if data already exists
  const existingCount = await endpointRepository.count();
  if (existingCount > 0) {
    console.log('Endpoints already seeded, skipping...');
    return;
  }

  const sampleEndpoints = [
    {
      name: 'Google Homepage',
      url: 'https://www.google.com',
      method: HttpMethod.GET,
      checkInterval: 60,
      expectedStatusCode: 200,
      timeoutThreshold: 5000,
      isActive: true,
      currentStatus: EndpointStatus.UNKNOWN,
    },
    {
      name: 'JSONPlaceholder API',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: HttpMethod.GET,
      checkInterval: 120,
      expectedStatusCode: 200,
      timeoutThreshold: 3000,
      isActive: true,
      currentStatus: EndpointStatus.UNKNOWN,
    },
    {
      name: 'HTTPBin GET Test',
      url: 'https://httpbin.org/get',
      method: HttpMethod.GET,
      checkInterval: 180,
      expectedStatusCode: 200,
      timeoutThreshold: 5000,
      isActive: true,
      currentStatus: EndpointStatus.UNKNOWN,
    },
    {
      name: 'HTTPBin POST Test',
      url: 'https://httpbin.org/post',
      method: HttpMethod.POST,
      headers: { 'Content-Type': 'application/json' },
      body: { test: 'data' },
      checkInterval: 300,
      expectedStatusCode: 200,
      timeoutThreshold: 5000,
      isActive: true,
      currentStatus: EndpointStatus.UNKNOWN,
    },
    {
      name: 'GitHub API Status',
      url: 'https://api.github.com/status',
      method: HttpMethod.GET,
      headers: { 'User-Agent': 'Vigil-Monitor' },
      checkInterval: 300,
      expectedStatusCode: 200,
      timeoutThreshold: 5000,
      isActive: true,
      currentStatus: EndpointStatus.UNKNOWN,
    },
  ];

  await endpointRepository.save(sampleEndpoints);
  console.log(`✅ Seeded ${sampleEndpoints.length} endpoints`);
}
