/**
 * 메모리 누수 검증 스크립트
 *
 * 반복적인 API 호출로 메모리 사용량을 모니터링하여 누수를 감지합니다.
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

// 테스트 설정
const config = {
  iterations: 10,              // 반복 횟수 (각 반복에 100 요청)
  requestsPerIteration: 100,   // 반복당 요청 수
  delayBetweenIterations: 5000, // 반복 사이 대기 시간 (ms) - GC 실행 시간
  memoryThreshold: 50,         // 메모리 증가 임계값 (MB)
};

// 테스트할 엔드포인트
const endpoints = [
  { method: 'GET', path: '/api/endpoints', name: 'Endpoints List' },
  { method: 'GET', path: '/api/statistics/overview', name: 'Statistics Overview' },
];

/**
 * HTTP 요청 수행
 */
function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
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
        resolve({ statusCode: res.statusCode });
      });
    });

    req.on('error', (error) => {
      resolve({ statusCode: 0, error: error.message });
    });

    req.end();
  });
}

/**
 * 메모리 사용량 측정
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // Resident Set Size (MB)
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // Heap Used (MB)
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // Heap Total (MB)
    external: Math.round(usage.external / 1024 / 1024), // External (MB)
  };
}

/**
 * Garbage Collection 강제 실행 (--expose-gc 플래그 필요)
 */
function forceGC() {
  if (global.gc) {
    global.gc();
    return true;
  }
  return false;
}

/**
 * 단일 반복 실행
 */
async function runIteration(endpoint, iterationNum) {
  console.log(`\n   Iteration ${iterationNum}: ${config.requestsPerIteration} requests...`);

  const promises = [];
  for (let i = 0; i < config.requestsPerIteration; i++) {
    promises.push(makeRequest(endpoint.method, endpoint.path));
  }

  await Promise.all(promises);
}

/**
 * 엔드포인트별 메모리 누수 테스트
 */
async function testEndpoint(endpoint) {
  console.log(`\n🔍 Testing: ${endpoint.name}`);
  console.log(`   ${endpoint.method} ${endpoint.path}`);
  console.log('   ----------------------------------------');

  const memorySnapshots = [];

  // 초기 메모리 상태
  const initialMemory = getMemoryUsage();
  memorySnapshots.push({ iteration: 0, ...initialMemory });
  console.log(`\n   Initial Memory:`);
  console.log(`   • RSS: ${initialMemory.rss}MB`);
  console.log(`   • Heap Used: ${initialMemory.heapUsed}MB`);
  console.log(`   • Heap Total: ${initialMemory.heapTotal}MB`);

  // 반복 테스트
  for (let i = 1; i <= config.iterations; i++) {
    await runIteration(endpoint, i);

    // GC 강제 실행 (가능한 경우)
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
    const gcForced = forceGC();

    // 메모리 측정
    const currentMemory = getMemoryUsage();
    memorySnapshots.push({ iteration: i, ...currentMemory });

    console.log(`   Memory after iteration ${i}:`);
    console.log(`   • RSS: ${currentMemory.rss}MB (${currentMemory.rss >= initialMemory.rss ? '+' : ''}${currentMemory.rss - initialMemory.rss}MB)`);
    console.log(`   • Heap Used: ${currentMemory.heapUsed}MB (${currentMemory.heapUsed >= initialMemory.heapUsed ? '+' : ''}${currentMemory.heapUsed - initialMemory.heapUsed}MB)`);

    // 반복 사이 대기
    if (i < config.iterations) {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenIterations));
    }
  }

  // 최종 분석
  console.log(`\n   📊 Memory Analysis:`);

  const finalMemory = memorySnapshots[memorySnapshots.length - 1];
  const memoryGrowth = {
    rss: finalMemory.rss - initialMemory.rss,
    heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
    heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
  };

  console.log(`   • RSS Growth: ${memoryGrowth.rss}MB`);
  console.log(`   • Heap Used Growth: ${memoryGrowth.heapUsed}MB`);
  console.log(`   • Heap Total Growth: ${memoryGrowth.heapTotal}MB`);

  // 누수 감지
  const totalRequests = config.iterations * config.requestsPerIteration;
  const leakDetected = memoryGrowth.heapUsed > config.memoryThreshold;
  const memoryPerRequest = (memoryGrowth.heapUsed * 1024) / totalRequests; // KB per request

  console.log(`\n   • Total Requests: ${totalRequests}`);
  console.log(`   • Memory per Request: ${memoryPerRequest.toFixed(2)} KB`);

  if (leakDetected) {
    console.log(`\n   ❌ Potential Memory Leak Detected!`);
    console.log(`   • Heap grew by ${memoryGrowth.heapUsed}MB (threshold: ${config.memoryThreshold}MB)`);
  } else {
    console.log(`\n   ✅ No Memory Leak Detected`);
    console.log(`   • Memory growth is within acceptable range`);
  }

  return {
    endpoint: endpoint.name,
    initialMemory,
    finalMemory,
    memoryGrowth,
    leakDetected,
    memoryPerRequest,
    snapshots: memorySnapshots,
  };
}

/**
 * 메인 함수
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║       Vigil Memory Leak Detection Test            ║');
  console.log('╚════════════════════════════════════════════════════╝');

  // GC 사용 가능 여부 확인
  const gcAvailable = global.gc !== undefined;
  if (!gcAvailable) {
    console.log('\n⚠️  Warning: Garbage Collection is not exposed');
    console.log('   Run with: node --expose-gc scripts/memory-leak-test.js');
    console.log('   Test will continue but GC won\'t be forced between iterations\n');
  } else {
    console.log('\n✅ Garbage Collection is available\n');
  }

  console.log(`⚙️  Test Configuration:`);
  console.log(`   • Iterations: ${config.iterations}`);
  console.log(`   • Requests per Iteration: ${config.requestsPerIteration}`);
  console.log(`   • Total Requests: ${config.iterations * config.requestsPerIteration}`);
  console.log(`   • Delay Between Iterations: ${config.delayBetweenIterations}ms`);
  console.log(`   • Memory Threshold: ${config.memoryThreshold}MB`);

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    // 다음 엔드포인트 테스트 전 대기
    if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
      console.log(`\n   Waiting 10 seconds before next endpoint test...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // 전체 요약
  console.log('\n\n╔════════════════════════════════════════════════════╗');
  console.log('║              Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const leaksDetected = results.filter(r => r.leakDetected).length;

  results.forEach((result, index) => {
    const icon = result.leakDetected ? '❌' : '✅';
    console.log(`${index + 1}. ${icon} ${result.endpoint}`);
    console.log(`   Heap Growth: ${result.memoryGrowth.heapUsed}MB | Per Request: ${result.memoryPerRequest.toFixed(2)}KB`);
  });

  console.log(`\n📊 Overall Result:`);
  console.log(`   • Endpoints Tested: ${results.length}`);
  console.log(`   • Memory Leaks Detected: ${leaksDetected}`);
  console.log(`   • Status: ${leaksDetected === 0 ? '✅ All Clear' : '⚠️  Leaks Found'}\\n`);

  if (leaksDetected > 0) {
    console.log(`⚠️  Recommendations:`);
    console.log(`   • Check for event listeners not being removed`);
    console.log(`   • Verify timers/intervals are cleared`);
    console.log(`   • Review global variables and closures`);
    console.log(`   • Check for circular references`);
    console.log(`   • Monitor database connection pooling\\n`);
  }
}

// 실행
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
