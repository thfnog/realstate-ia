
const instanceName = 'realstate-iabroker-test-id';

async function testConnect() {
  console.log(`🧪 Testing /api/whatsapp/instance connect for ${instanceName}...`);
  try {
    const res = await fetch('http://localhost:3000/api/whatsapp/instance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceName,
        action: 'connect'
      })
    });
    
    const status = res.status;
    const body = await res.json();
    
    console.log(`\nResponse Status: ${status}`);
    console.log('Response Body:', JSON.stringify(body, null, 2));
    
    if (status === 200) {
      console.log('\n✅ Success! QR Code generated.');
    } else {
      console.log(`\n❌ Failed with status ${status}`);
    }
  } catch (error) {
    console.error('\n💥 Fetch error:', error);
  }
}

testConnect();
