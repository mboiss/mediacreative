const http = require('http');

async function testApi() {
  console.log("Testing dual-persistence endpoints local file fallback...");
  const fs = require('fs');
  const path = require('path');

  const jsonStore = require('../lib/json-store.ts');
  console.log("JSON store path data exists:", fs.existsSync(path.join(process.cwd(), 'data')));
}

testApi();
