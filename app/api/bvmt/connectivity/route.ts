import { NextResponse } from 'next/server'

/**
 * Endpoint de diagnostic pour tester la connectivité au serveur BVMT
 * GET /api/bvmt/connectivity
 */

interface ConnectivityTest {
  test: string
  status: 'OK' | 'FAILED' | 'TIMEOUT' | 'UNKNOWN'
  code?: number
  error?: string
  time?: number
}

async function testUrl(name: string, url: string, method: 'HEAD' | 'GET' = 'HEAD'): Promise<ConnectivityTest> {
  const start = Date.now()
  try {
    const response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Diagnostic)',
      }
    })
    const time = Date.now() - start

    return {
      test: name,
      status: response.ok ? 'OK' : 'FAILED',
      code: response.status,
      time
    }
  } catch (error: any) {
    const time = Date.now() - start

    if (error?.name === 'AbortError') {
      return {
        test: name,
        status: 'TIMEOUT',
        error: 'Request timeout after 10s',
        time
      }
    }

    const errorMsg = error?.message || String(error)

    if (errorMsg.includes('ECONNREFUSED')) {
      return {
        test: name,
        status: 'FAILED',
        error: 'Connection refused - Server is likely offline',
        time
      }
    }

    if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('DNS')) {
      return {
        test: name,
        status: 'FAILED',
        error: 'DNS resolution failed',
        time
      }
    }

    if (errorMsg.includes('ETIMEDOUT')) {
      return {
        test: name,
        status: 'TIMEOUT',
        error: 'Network timeout - No route to host',
        time
      }
    }

    return {
      test: name,
      status: 'UNKNOWN',
      error: errorMsg,
      time
    }
  }
}

export async function GET() {
  console.log('[BVMT Connectivity] Starting diagnostic tests...')

  const tests: ConnectivityTest[] = []

  // Test 1: BVMT main site
  console.log('[BVMT Connectivity] Test 1: Main BVMT site')
  tests.push(
    await testUrl(
      'BVMT Main Site',
      'https://tunis-stockexchange.com/',
      'GET'
    )
  )

  // Test 2: BVMT files directory (404 expected but server must respond)
  console.log('[BVMT Connectivity] Test 2: BVMT files directory')
  tests.push(
    await testUrl(
      'BVMT Files Directory',
      'https://tunis-stockexchange.com/sites/default/files/',
      'GET'
    )
  )

  // Test 3: Specific PDF (most recent)
  console.log('[BVMT Connectivity] Test 3: Recent PDF')
  tests.push(
    await testUrl(
      'BVMT Recent PDF (2026-05-22)',
      'https://tunis-stockexchange.com/sites/default/files/2026-05/fr-physionomie-seance-2026-05-22.pdf',
      'HEAD'
    )
  )

  // Test 4: Google (to check general internet connectivity)
  console.log('[BVMT Connectivity] Test 4: General internet (Google)')
  tests.push(
    await testUrl(
      'General Internet (Google)',
      'https://google.com/',
      'GET'
    )
  )

  // Test 5: Anthropic API (for Claude extraction)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('[BVMT Connectivity] Test 5: Anthropic API')
    tests.push(
      await testUrl(
        'Anthropic API',
        'https://api.anthropic.com/v1/messages',
        'GET'
      )
    )
  }

  // Analyze results
  const summary = {
    total: tests.length,
    ok: tests.filter(t => t.status === 'OK').length,
    failed: tests.filter(t => t.status === 'FAILED').length,
    timeout: tests.filter(t => t.status === 'TIMEOUT').length,
    unknown: tests.filter(t => t.status === 'UNKNOWN').length,
  }

  // Determine overall status
  let overallStatus: 'ONLINE' | 'INTERMITTENT' | 'OFFLINE' | 'NETWORK_DOWN'
  let recommendation: string

  const bvmtTests = tests.filter(t => t.test.includes('BVMT'))
  const bvmtOk = bvmtTests.filter(t => t.status === 'OK').length

  if (bvmtOk === bvmtTests.length) {
    overallStatus = 'ONLINE'
    recommendation = 'BVMT server is reachable. The issue might be elsewhere.'
  } else if (bvmtOk > 0) {
    overallStatus = 'INTERMITTENT'
    recommendation = 'BVMT server is partially reachable. Some endpoints respond, others do not.'
  } else if (tests.some(t => t.test.includes('General Internet') && t.status === 'OK')) {
    overallStatus = 'OFFLINE'
    recommendation = 'BVMT server is offline, but your internet connection works. Try again later.'
  } else {
    overallStatus = 'NETWORK_DOWN'
    recommendation = 'Your internet connection might be down. Check your network.'
  }

  console.log(`[BVMT Connectivity] Overall status: ${overallStatus}`)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary,
    status: overallStatus,
    recommendation,
    tests,
    solutions: {
      'OFFLINE': 'BVMT is offline. Use ?test=1 for mock data.',
      'NETWORK_DOWN': 'Check your internet connection.',
      'INTERMITTENT': 'Try again in a few moments.',
      'ONLINE': 'Server is reachable. Check API logs for details.'
    }[overallStatus],
  })
}
