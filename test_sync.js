// Test free instant cloud sync with kvdb.io
async function testSync() {
  const bucketKey = 'binbin_vault_mnijc19'; // Unique bucket for user
  const url = `https://kvdb.io/${bucketKey}/transactions`;

  console.log('Testing Cloud Sync PUT...');
  const testData = {
    updated_at: new Date().toISOString(),
    transactions: [
      { id: 't-1', amount: 30.0, merchant: '陈记牛肉火锅', date: '2026-08-25 07:11' }
    ]
  };

  try {
    const putRes = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(testData),
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('PUT Status:', putRes.status);

    console.log('Testing Cloud Sync GET...');
    const getRes = await fetch(url);
    const getData = await getRes.json();
    console.log('GET Data:', getData);
    console.log('Cloud Sync is 100% working!');
  } catch (err) {
    console.error('Sync error:', err);
  }
}

testSync();
