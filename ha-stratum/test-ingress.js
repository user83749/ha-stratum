import http from 'http';
const options = {
  hostname: 'localhost',
  port: 8099,
  path: '/',
  method: 'GET',
  headers: {
    'x-ingress-path': '/api/hassio_ingress/abcdef'
  }
};
const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
  res.on('data', chunk => process.stdout.write(chunk));
});
req.on('error', e => console.error(e));
req.end();
