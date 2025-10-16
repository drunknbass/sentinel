/**
 * Discovery script for RSO PressAccess JSON endpoints
 *
 * This script uses Playwright to capture XHR/fetch requests from the RSO site
 * to discover the underlying JSON API endpoints instead of scraping HTML.
 *
 * Usage: npx ts-node lib/discovery/pressaccess-discover.ts
 */

import { chromium } from 'playwright';

type DiscoveredEndpoint = {
  method: string;
  url: string;
  status: number;
  contentType: string;
  sample: any;
};

async function discoverEndpoints() {
  const url = 'https://pressaccess.riversidesheriff.org/';
  console.log(`[DISCOVERY] Launching browser for ${url}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const hits: DiscoveredEndpoint[] = [];

  // Intercept all network responses
  page.on('response', async (res) => {
    try {
      const ct = res.headers()['content-type'] || '';
      const req = res.request();
      const responseUrl = res.url();

      // Look for JSON/XHR/DataTables-like calls
      const isCandidate =
        ct.includes('application/json') ||
        responseUrl.match(/(api|graphql|datatable|data|calls|incidents|cad|ajax)/i) ||
        req.method() === 'POST';

      if (isCandidate) {
        const status = res.status();
        let body: any = null;

        try {
          body = await res.json();
        } catch {
          try {
            const text = await res.text();
            body = text.slice(0, 1000);
          } catch {
            body = null;
          }
        }

        const endpoint: DiscoveredEndpoint = {
          method: req.method(),
          url: responseUrl,
          status,
          contentType: ct,
          sample: body
        };

        hits.push(endpoint);
        console.log(`[HIT] ${req.method()} ${responseUrl} (${status})`);
      }
    } catch (err) {
      // Ignore errors from individual responses
    }
  });

  // Navigate to the site and wait for network to be idle
  console.log('[DISCOVERY] Navigating to site...');
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait additional time for any lazy-loaded content
  console.log('[DISCOVERY] Waiting for additional XHR requests...');
  await page.waitForTimeout(4000);

  // Try clicking on region tabs if they exist to trigger more requests
  try {
    const regionButtons = await page.$$('[role="tab"], button, a');
    console.log(`[DISCOVERY] Found ${regionButtons.length} potential interactive elements`);

    for (const button of regionButtons.slice(0, 5)) {
      try {
        const text = await button.textContent();
        if (text && /region|area|zone|filter/i.test(text)) {
          console.log(`[DISCOVERY] Clicking: ${text}`);
          await button.click();
          await page.waitForTimeout(2000);
        }
      } catch {
        // Element might not be clickable
      }
    }
  } catch {
    console.log('[DISCOVERY] No interactive elements found');
  }

  await browser.close();

  console.log(`\n[DISCOVERY] Found ${hits.length} candidate endpoint(s)\n`);

  // Print results
  hits.forEach((hit, idx) => {
    console.log(`\n--- Endpoint ${idx + 1} ---`);
    console.log(`Method: ${hit.method}`);
    console.log(`URL: ${hit.url}`);
    console.log(`Status: ${hit.status}`);
    console.log(`Content-Type: ${hit.contentType}`);
    console.log(`Sample (first 500 chars):`);
    console.log(JSON.stringify(hit.sample, null, 2).slice(0, 500));
  });

  return hits;
}

export { discoverEndpoints };

// Run discovery if this is the main module
discoverEndpoints()
  .then(() => {
    console.log('\n[DISCOVERY] Complete!');
    console.log('\nNext steps:');
    console.log('1. Review the discovered endpoints above');
    console.log('2. Identify the main incidents/data endpoint');
    console.log('3. Update .env with the endpoint URL');
    console.log('   RSO_DIRECT_ENDPOINT=<the-json-url-you-found>');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[DISCOVERY] Error:', err);
    process.exit(1);
  });
