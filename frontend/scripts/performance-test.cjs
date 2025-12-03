/**
 * 프론트엔드 성능 테스트 스크립트
 *
 * Playwright를 사용하여 주요 페이지의 성능을 측정합니다.
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';

// 테스트할 페이지
const pages = [
  { name: 'Dashboard', url: '/' },
  { name: 'Endpoints List', url: '/endpoints' },
  { name: 'Endpoint Create', url: '/endpoints/new' },
  { name: 'Statistics', url: '/statistics' },
  { name: 'Incidents', url: '/incidents' },
];

// 성능 목표
const PERFORMANCE_TARGETS = {
  FCP: 1800,  // First Contentful Paint (ms)
  LCP: 2500,  // Largest Contentful Paint (ms)
  TTI: 3800,  // Time to Interactive (ms)
  TBT: 200,   // Total Blocking Time (ms)
};

/**
 * 페이지 로드 성능 측정
 */
async function measurePageLoad(page, pageName, url) {
  console.log(`\n📊 Testing: ${pageName}`);
  console.log(`   URL: ${url}`);
  console.log('   ----------------------------------------');

  try {
    // 페이지 로드 시작
    const startTime = Date.now();
    await page.goto(BASE_URL + url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    const loadTime = Date.now() - startTime;

    // 페이지 메트릭 수집
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');

      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        domComplete: navigation.domComplete - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        fcp: fcp ? fcp.startTime : null,
      };
    });

    // Web Vitals 수집 (간단 버전)
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        let lcp = 0;
        let fid = 0;
        let cls = 0;

        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.renderTime || lastEntry.loadTime;
        });

        try {
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          // LCP not supported
        }

        // FID (First Input Delay) - 간단 버전
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.processingStart > entry.startTime) {
              fid = entry.processingStart - entry.startTime;
            }
          });
        });

        try {
          fidObserver.observe({ type: 'first-input', buffered: true });
        } catch (e) {
          // FID not supported
        }

        // CLS (Cumulative Layout Shift) - 간단 버전
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          cls = clsValue;
        });

        try {
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          // CLS not supported
        }

        // 약간의 지연 후 결과 반환
        setTimeout(() => {
          resolve({ lcp, fid, cls });
        }, 100);
      });
    });

    // JavaScript 실행 시간 측정
    const jsMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      const scripts = entries.filter(entry => entry.initiatorType === 'script');
      const totalDuration = scripts.reduce((sum, script) => sum + script.duration, 0);
      return {
        scriptCount: scripts.length,
        totalDuration: Math.round(totalDuration),
        averageDuration: scripts.length > 0 ? Math.round(totalDuration / scripts.length) : 0,
      };
    });

    // 번들 크기 측정
    const bundleSize = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      const totalSize = entries.reduce((sum, entry) => {
        return sum + (entry.transferSize || entry.encodedBodySize || 0);
      }, 0);
      return Math.round(totalSize / 1024); // KB로 변환
    });

    // 결과 출력
    console.log(`\n   📈 Load Times:`);
    console.log(`   • Total Load Time:     ${loadTime}ms`);
    console.log(`   • DOM Content Loaded:  ${Math.round(metrics.domContentLoaded)}ms`);
    console.log(`   • DOM Interactive:     ${Math.round(metrics.domInteractive)}ms`);
    console.log(`   • DOM Complete:        ${Math.round(metrics.domComplete)}ms`);
    console.log(`   • Load Complete:       ${Math.round(metrics.loadComplete)}ms`);

    console.log(`\n   🎨 Paint Metrics:`);
    console.log(`   • FCP (First Contentful Paint): ${metrics.fcp ? Math.round(metrics.fcp) + 'ms' : 'N/A'}`);
    console.log(`   • LCP (Largest Contentful Paint): ${Math.round(webVitals.lcp)}ms`);

    console.log(`\n   ⚡ Web Vitals:`);
    console.log(`   • FID (First Input Delay):  ${Math.round(webVitals.fid)}ms`);
    console.log(`   • CLS (Cumulative Layout Shift): ${webVitals.cls.toFixed(3)}`);

    console.log(`\n   📦 Resources:`);
    console.log(`   • Total Bundle Size:   ${bundleSize}KB`);
    console.log(`   • Script Count:        ${jsMetrics.scriptCount}`);
    console.log(`   • Script Duration:     ${jsMetrics.totalDuration}ms (avg: ${jsMetrics.averageDuration}ms)`);

    // 성능 등급 계산
    const performanceScore = calculatePerformanceScore({
      fcp: metrics.fcp,
      lcp: webVitals.lcp,
      fid: webVitals.fid,
      cls: webVitals.cls,
      tti: metrics.domInteractive,
    });

    console.log(`\n   ${performanceScore >= 90 ? '✅' : performanceScore >= 50 ? '⚠️' : '❌'} Performance Score: ${performanceScore}/100`);

    return {
      page: pageName,
      loadTime,
      fcp: metrics.fcp,
      lcp: webVitals.lcp,
      fid: webVitals.fid,
      cls: webVitals.cls,
      bundleSize,
      performanceScore,
      passed: performanceScore >= 90,
    };
  } catch (error) {
    console.log(`\n   ❌ Error: ${error.message}`);
    return {
      page: pageName,
      error: error.message,
      passed: false,
    };
  }
}

/**
 * 성능 점수 계산 (Lighthouse 방식 참고)
 */
function calculatePerformanceScore(metrics) {
  let score = 100;

  // FCP 평가 (1800ms 기준)
  if (metrics.fcp) {
    if (metrics.fcp > 3000) score -= 20;
    else if (metrics.fcp > 1800) score -= 10;
  }

  // LCP 평가 (2500ms 기준)
  if (metrics.lcp > 4000) score -= 25;
  else if (metrics.lcp > 2500) score -= 15;

  // FID 평가 (100ms 기준)
  if (metrics.fid > 300) score -= 15;
  else if (metrics.fid > 100) score -= 8;

  // CLS 평가 (0.1 기준)
  if (metrics.cls > 0.25) score -= 20;
  else if (metrics.cls > 0.1) score -= 10;

  // TTI 평가 (3800ms 기준)
  if (metrics.tti > 7300) score -= 20;
  else if (metrics.tti > 3800) score -= 10;

  return Math.max(0, score);
}

/**
 * 메인 함수
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║      Vigil Frontend Performance Test              ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`\n⚙️  Performance Targets (Lighthouse-based):`);
  console.log(`   • FCP (First Contentful Paint):    < ${PERFORMANCE_TARGETS.FCP}ms`);
  console.log(`   • LCP (Largest Contentful Paint):  < ${PERFORMANCE_TARGETS.LCP}ms`);
  console.log(`   • TTI (Time to Interactive):       < ${PERFORMANCE_TARGETS.TTI}ms`);
  console.log(`   • TBT (Total Blocking Time):       < ${PERFORMANCE_TARGETS.TBT}ms`);
  console.log(`   • Target Score:                    >= 90/100`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  const testResults = [];

  for (const pageInfo of pages) {
    const result = await measurePageLoad(page, pageInfo.name, pageInfo.url);
    testResults.push(result);

    // 각 페이지 테스트 사이에 잠시 대기
    await page.waitForTimeout(1000);
  }

  await browser.close();

  // 전체 요약
  console.log('\n\n╔════════════════════════════════════════════════════╗');
  console.log('║              Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const passedCount = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

  testResults.forEach((result, index) => {
    if (result.error) {
      console.log(`${index + 1}. ❌ ${result.page} - Error: ${result.error}`);
    } else {
      const icon = result.passed ? '✅' : '⚠️';
      console.log(`${index + 1}. ${icon} ${result.page}`);
      console.log(`   Score: ${result.performanceScore}/100 | Load: ${result.loadTime}ms | LCP: ${Math.round(result.lcp)}ms`);
    }
  });

  // 평균 성능 점수
  const validResults = testResults.filter(r => !r.error);
  const avgScore = validResults.reduce((sum, r) => sum + r.performanceScore, 0) / validResults.length;

  console.log(`\n📊 Overall Performance:`);
  console.log(`   • Tests Passed:      ${passedCount}/${totalTests}`);
  console.log(`   • Average Score:     ${avgScore.toFixed(1)}/100`);
  console.log(`   • Status:            ${avgScore >= 90 ? '✅ Excellent' : avgScore >= 50 ? '⚠️  Good' : '❌ Needs Improvement'}\n`);
}

// 실행
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
