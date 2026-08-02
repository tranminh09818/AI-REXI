const http = require('http');

// Test launch
const postData = JSON.stringify({ url: 'https://google.com' });
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/services/browser/launch',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Launch:', body);
    
    // Check status
    http.get('http://localhost:5000/api/services/browser/status', (res2) => {
      let status = '';
      res2.on('data', (chunk) => { status += chunk; });
      res2.on('end', () => {
        console.log('Status:', status);
        process.exit(0);
      });
    });
  });
});
req.write(postData);
req.end();
