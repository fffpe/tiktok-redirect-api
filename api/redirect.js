export default async function handler(req, res) {
  // Enable CORS so Lovable can call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { timeOnPage, fingerprint } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

  console.log('Request from IP:', ip, 'Time on page:', timeOnPage);

  // VALIDATION 1: Time on page (minimum 2 seconds)
  if (!timeOnPage || timeOnPage < 2000) {
    console.log('Blocked: Too fast');
    return res.status(400).json({ error: 'Too fast' });
  }

  // VALIDATION 2: Basic IP check (block if datacenter)
  const isBot = checkIfBot(ip);
  if (isBot) {
    console.log('Blocked: Bot IP detected');
    return res.status(403).json({ error: 'Blocked' });
  }

  // VALIDATION 3: Rate limiting
  const rateLimitKey = `${ip}-${JSON.stringify(fingerprint)}`;
  if (isRateLimited(rateLimitKey)) {
    console.log('Blocked: Rate limited');
    return res.status(429).json({ error: 'Rate limited' });
  }
  
  recordRequest(rateLimitKey);

  // ALL CHECKS PASSED - Return redirect URL
  const token = generateToken();
  const redirectUrl = `https://t.afftrackr.com/?bbz=whsZesGHt%2b5bYZDac%2boZs1%2bpc7tdAT1SvQJDRoz7h5U%3d&s1=testnewcloak90&t=${token}`;

  console.log('Approved: Redirecting to offer');
  return res.status(200).json({ redirectUrl });
}

// Simple bot check
function checkIfBot(ip) {
  // Block common datacenter IP ranges
  const datacenterRanges = [
    '216.244.66', // DigitalOcean
    '159.89',     // DigitalOcean
    '134.122',    // DigitalOcean
    '167.172',    // DigitalOcean
    '138.197',    // DigitalOcean
    '157.245',    // DigitalOcean
    '104.248',    // DigitalOcean
    '206.189',    // DigitalOcean
  ];
  
  return datacenterRanges.some(range => ip.startsWith(range));
}

// Simple in-memory rate limiting
const requestLog = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const record = requestLog.get(key);
  
  if (!record) return false;
  
  // Allow max 2 requests per hour
  if (record.count >= 2 && (now - record.firstRequest) < 3600000) {
    return true;
  }
  
  // Reset if hour passed
  if ((now - record.firstRequest) >= 3600000) {
    requestLog.delete(key);
    return false;
  }
  
  return false;
}

function recordRequest(key) {
  const now = Date.now();
  const record = requestLog.get(key);
  
  if (!record) {
    requestLog.set(key, { count: 1, firstRequest: now });
  } else {
    record.count++;
  }
}

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
