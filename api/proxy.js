export default async function handler(req, res) {
  let targetPath = req.url;
  
  const targetUrl = 'https://eztila-butik.rexkar.chatgpt.site' + targetPath;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  }

  const options = {
    method: req.method,
    headers: headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  };

  try {
    const response = await fetch(targetUrl, options);
    
    res.status(response.status);
    
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });
    
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
}
