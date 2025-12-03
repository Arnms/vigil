/**
 * 성능 테스트 스크립트
 *
 * 주요 API 엔드포인트의 응답 시간을 측정합니다.
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

// 테스트할 엔드포인트
const endpoints = [
  { method: 'GET', path: '/api/endpoints', name: 'Endpoints List' },
  { method: 'GET', path: '/api/statistics/overview', name: 'Statistics Overview' },
  { method: 'GET', path: '/api/incidents', name: 'Incidents List' },
  { method: 'GET', path: '/api/statistics/uptime-timeseries?period=day', name: 'Uptime Timeseries' },
  { method: 'GET', path: '/api/statistics/response-time-timeseries?period=day', name: 'Response Time Timeseries' },
];

// 테스트 설정
const config = {
  warmupRequests: 5,      // 워밍업 요청 수
  testRequests: 100,      // 실제 측정 요청 수
  concurrency: 10,        // 동시 요청 수
};

/**
 * HTTP 요청 수행 및 시간 측정
 */
function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        resolve({
          statusCode: res.statusCode,
          duration: duration,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      resolve({
        statusCode: 0,
        duration: duration,
        success: false,
        error: error.message,
      });
    });

    req.end();
  });
}

/**
 * 통계 계산
 */
function calculateStats(results) {
  const durations = results.map(r => r.duration).sort((a, b) => a - b);
  const successCount = results.filter(r => r.success).length;

  const sum = durations.reduce((acc, val) => acc + val, 0);
  const avg = sum / durations.length;

  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p90 = durations[Math.floor(durations.length * 0.9)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];

  const min = durations[0];
  const max = durations[durations.length - 1];

  return {
    total: results.length,
    success: successCount,
    failed: results.length - successCount,
    successRate: ((successCount / results.length) * 100).toFixed(2),
    min: min,
    max: max,
    avg: avg.toFixed(2),
    p50: p50,
    p90: p90,
    p95: p95,
    p99: p99,
  };
}

/**
 * 단일 엔드포인트 테스트
 */
async function testEndpoint(endpoint) {
  console.log(`\n📊 Testing: ${endpoint.name}`);
  console.log(`   ${endpoint.method} ${endpoint.path}`);
  console.log('   ----------------------------------------');

  // 워밍업
  console.log(`   🔥 Warming up (${config.warmupRequests} requests)...`);
  for (let i = 0; i < config.warmupRequests; i++) {
    await makeRequest(endpoint.method, endpoint.path);
  }

  // 실제 테스트
  console.log(`   ⚡ Running test (${config.testRequests} requests)...`);
  const results = [];

  // 동시성 제어를 위한 배치 처리
  const batchSize = config.concurrency;
  const batches = Math.ceil(config.testRequests / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const batchPromises = [];
    const requestsInBatch = Math.min(batchSize, config.testRequests - batch * batchSize);

    for (let i = 0; i < requestsInBatch; i++) {
      batchPromises.push(makeRequest(endpoint.method, endpoint.path));
    }

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const stats = calculateStats(results);

  console.log(`\n   📈 Results:`);
  console.log(`   • Total Requests:  ${stats.total}`);
  console.log(`   • Success:         ${stats.success} (${stats.successRate}%)`);
  console.log(`   • Failed:          ${stats.failed}`);
  console.log(`   • Min:             ${stats.min}ms`);
  console.log(`   • Max:             ${stats.max}ms`);
  console.log(`   • Average:         ${stats.avg}ms`);
  console.log(`   • P50 (Median):    ${stats.p50}ms`);
  console.log(`   • P90:             ${stats.p90}ms`);
  console.log(`   • P95:             ${stats.p95}ms`);
  console.log(`   • P99:             ${stats.p99}ms`);

  // 목표 응답 시간 체크 (평균 200ms 이하)
  const targetAvg = 200;
  const passed = parseFloat(stats.avg) <= targetAvg;
  console.log(`\n   ${passed ? '✅' : '❌'} Target Average (${targetAvg}ms): ${passed ? 'PASSED' : 'FAILED'}`);

  return {
    endpoint: endpoint.name,
    stats: stats,
    passed: passed,
  };
}

/**
 * 메인 함수
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║       Vigil API Performance Test                  ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`\n⚙️  Configuration:`);
  console.log(`   • Warmup Requests:  ${config.warmupRequests}`);
  console.log(`   • Test Requests:    ${config.testRequests}`);
  console.log(`   • Concurrency:      ${config.concurrency}`);
  console.log(`   • Target Average:   200ms`);

  const testResults = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    testResults.push(result);
  }

  // 전체 요약
  console.log('\n\n╔════════════════════════════════════════════════════╗');
  console.log('║              Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const passedCount = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

  testResults.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.endpoint}`);
    console.log(`   Avg: ${result.stats.avg}ms | P95: ${result.stats.p95}ms | Success: ${result.stats.successRate}%`);
  });

  console.log(`\n📊 Overall: ${passedCount}/${totalTests} tests passed`);
  console.log(`\n${passedCount === totalTests ? '✅ All tests passed!' : '⚠️  Some tests failed'}\n`);
}

// 실행
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
