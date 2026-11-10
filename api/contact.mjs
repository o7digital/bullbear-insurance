export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({ error:'Method not allowed' }); }
  const expected = `https://${req.headers.host}`;
  if (req.headers.origin !== expected || !req.headers['content-type']?.startsWith('application/json')) return res.status(403).json({error:'Invalid origin'});
  if (!process.env.STUDIO_URL || !process.env.CONTACT_PROXY_SECRET) return res.status(503).json({error:'Contact is unavailable'});
  if (Number(req.headers['content-length'] || 0)>4096) return res.status(413).json({error:'Request too large'});
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error:'Invalid JSON' }); }
  try {
    const response = await fetch(process.env.STUDIO_URL+'/api/contact', {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.CONTACT_PROXY_SECRET}`,'X-Contact-Client':req.headers['x-forwarded-for']?.split(',')[0] || 'unknown'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    return res.status(response.status).json(response.ok ? {ok:true} : {error:'Unable to submit'});
  } catch { return res.status(503).json({error:'Contact is unavailable'}); }
}
