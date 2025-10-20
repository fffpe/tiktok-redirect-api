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

  console.log('Request from:', ip, 'Time:', timeOnPage, 'Verification:', verification);

  // VALIDATION 1: Verification text check (NEW)
  if (!verification || verification.toLowerCase().trim() !== 'start') {
    console.log('Blocked: Invalid verification text');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid verification' })
    };
  }

  // VALIDATION 2: Time check
  if (!timeOnPage || timeOnPage < 2000) {
    console.log('Blocked: Too fast');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Too fast' })
    };
  }

  // VALIDATION 3: IP check
  const datacenterRanges = ['216.244.66', '159.89', '134.122', '167.172', '138.197', '157.245', '104.248', '206.189'];
  const isBot = datacenterRanges.some(range => ip.startsWith(range));
  
  if (isBot) {
    console.log('Blocked: Bot IP');
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Blocked' })
    };
  }

  // VALIDATION 4: Rate limiting
  if (!global.requestLog) global.requestLog = new Map();
  
  const rateLimitKey = `${ip}-${JSON.stringify(fingerprint)}`;
  const now = Date.now();
  const record = global.requestLog.get(rateLimitKey);
  
  if (record && record.count >= 2 && (now - record.firstRequest) < 3600000) {
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

  // ALL CHECKS PASSED - Generate redirect URL
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const redirectUrl = `https://t.afftrackr.com/?bbz=whsZesGHt%2b5bYZDac%2boZs1%2bpc7tdAT1SvQJDRoz7h5U%3d&s1=testnewcloak90&t=${token}`;

  console.log('Approved: Redirecting');
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ redirectUrl })
  };
};
