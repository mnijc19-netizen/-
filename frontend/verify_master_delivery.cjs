const http = require('https');

console.log('Testing connection to deployed GitHub Pages...');
http.get('https://mnijc19-netizen.github.io/-/', (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers['content-type']);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Page HTML bytes received:', data.length);
    if (data.includes('SmartWealth') || data.includes('斌斌账本') || data.includes('root') || data.includes('vite')) {
      console.log('✅ Master deployment verified online successfully!');
    }
  });
}).on('error', (err) => {
  console.error('Error fetching deployed site:', err.message);
});
