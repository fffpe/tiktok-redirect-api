exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  const body = JSON.parse(event.body || '{}');
  const { timeOnPage, fingerprint, verification } = body;
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  console.log('Request from:', ip, 'Time:', timeOnPage);
  // VALIDATION 1: Verification check (keep this - blocks obvious bots)
  if (!verification || verification.toLowerCase().trim() !== 'start') {
    console.log('Blocked: Invalid verification');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid verification' })
    };
  }
  // VALIDATION 2: Time check - LOOSENED to 800ms (was 2000ms)
  // Blocks instant bots but allows fast mobile users
  if (!timeOnPage || timeOnPage < 800) {
    console.log('Blocked: Too fast');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Too fast' })
    };
  }
  // VALIDATION 3: IP check - REDUCED list to only most obvious datacenters
  // Removed some ranges that might catch real users
  const datacenterRanges = ['216.244.66', '159.89', '167.172'];
  const isBot = datacenterRanges.some(range => ip.startsWith(range));
  
  if (isBot) {
    console.log('Blocked: Bot IP');
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Blocked' })
    };
  }
  // VALIDATION 4: Rate limiting - INCREASED to 5 per hour (was 2)
  // Allows legitimate retries without blocking real users
  if (!global.requestLog) global.requestLog = new Map();
  
  const rateLimitKey = `${ip}-${JSON.stringify(fingerprint)}`;
  const now = Date.now();
  const record = global.requestLog.get(rateLimitKey);
  
  if (record && record.count >= 5 && (now - record.firstRequest) < 3600000) {
    console.log('Blocked: Rate limited');
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'Rate limited' })
    };
  }
  
  if (!record) {
    global.requestLog.set(rateLimitKey, { count: 1, firstRequest: now });
  } else {
    if ((now - record.firstRequest) >= 3600000) {
      global.requestLog.set(rateLimitKey, { count: 1, firstRequest: now });
    } else {
      record.count++;
    }
  }
  // ALL CHECKS PASSED - Generate redirect URL with NEW affiliate link
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const redirectUrl = `https://spnccrzone.com/?nc2u=T91rhLaRW5a34KD7TE9WFnt8vhjRlRLGvQJDRoz7h5U%3d&s1=tkii&t=${token}`;
  console.log('Approved: Redirecting');
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ redirectUrl })
  };
};
