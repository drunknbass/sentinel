const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
  });

  // Listen to network requests
  const apiRequests = [];
  page.on('request', request => {
    if (request.url().includes('/api/incidents')) {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
      apiRequests.push(request);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/incidents')) {
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
      try {
        const body = await response.text();
        console.log(`[RESPONSE BODY]:`, body.substring(0, 500));
      } catch (e) {
        console.log('[RESPONSE] Could not read body');
      }
    }
  });

  console.log('\n=== Testing Deployed Site ===\n');
  console.log('Navigating to: https://sentinel-91cu2lu6u-circle-creative-group.vercel.app\n');

  await page.goto('https://sentinel-91cu2lu6u-circle-creative-group.vercel.app', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  console.log('\nPage loaded. Waiting 2 seconds...\n');
  await page.waitForTimeout(2000);

  // Check if landing page is visible
  const landingVisible = await page.isVisible('text=Enter Map View').catch(() => false) ||
                         await page.isVisible('text=Continue').catch(() => false);

  if (landingVisible) {
    console.log('[INFO] Landing page detected. Clicking enter button...\n');
    await page.click('text=Continue').catch(() => page.click('button').first());
    await page.waitForTimeout(3000);
  }

  // Check the incident count button
  const incidentButton = await page.locator('button:has-text("INCIDENTS")').first();
  if (await incidentButton.isVisible()) {
    const text = await incidentButton.textContent();
    console.log(`[INFO] Incident count button text: "${text}"\n`);
  } else {
    console.log('[WARNING] Incident count button not found\n');
  }

  // Check if any API requests were made
  console.log(`\n[INFO] Total API requests made: ${apiRequests.length}\n`);

  // Get page state
  const pageState = await page.evaluate(() => {
    return {
      url: window.location.href,
      hasReact: typeof window.React !== 'undefined',
      bodyText: document.body.innerText.substring(0, 500),
      scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean),
      errors: window.__PAGE_ERRORS__ || []
    };
  });

  console.log('\n=== Page State ===');
  console.log('URL:', pageState.url);
  console.log('Has React:', pageState.hasReact);
  console.log('Body text preview:', pageState.bodyText);
  console.log('Number of scripts:', pageState.scripts.length);

  // Take a screenshot
  await page.screenshot({ path: '/tmp/deployed-site.png', fullPage: true });
  console.log('\n[INFO] Screenshot saved to /tmp/deployed-site.png\n');

  // Wait a bit longer to see if data loads
  console.log('Waiting 10 more seconds for data to load...\n');
  await page.waitForTimeout(10000);

  // Check final state
  const finalButton = await page.locator('button:has-text("INCIDENTS")').first();
  if (await finalButton.isVisible()) {
    const text = await finalButton.textContent();
    console.log(`[FINAL] Incident count button text: "${text}"\n`);
  }

  console.log(`[FINAL] Total API requests made: ${apiRequests.length}\n`);

  await browser.close();
})();
