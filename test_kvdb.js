async function testKvdbCreate() {
  const createRes = await fetch('https://kvdb.io/', { method: 'POST' });
  const bucketKey = await createRes.text();
  console.log('Created bucket key:', bucketKey.trim());

  const bucket = bucketKey.trim();
  const writeRes = await fetch(`https://kvdb.io/${bucket}/binbin_data`, {
    method: 'POST',
    body: JSON.stringify({ test: 'hello from binbin ledger', time: Date.now() })
  });
  console.log('Write status:', writeRes.status);

  const readRes = await fetch(`https://kvdb.io/${bucket}/binbin_data`);
  const readData = await readRes.json();
  console.log('Read data:', readData);
}

testKvdbCreate();
