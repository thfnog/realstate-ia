
const instanceName = 'broker_test_' + Date.now();

async function testCreate() {
  const url = 'http://35.172.170.210:8080/instance/create';
  const apikey = 'ImobIA_Sec_2024_!';
  
  console.log(`Creating instance: ${instanceName}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'apikey': apikey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instanceName,
        token: 'token_' + instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true
      })
    });
    
    const status = res.status;
    const data = await res.json();
    console.log(`Status: ${status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (status === 201) {
      console.log('✅ Created! Now waiting 2s to check listing...');
      await new Promise(r => setTimeout(r, 2000));
      
      const fetchRes = await fetch('http://35.172.170.210:8080/instance/fetchInstances', { headers: { 'apikey': apikey } });
      const instances = await fetchRes.json();
      const found = instances.find(i => i.instanceName === instanceName);
      console.log(found ? '✅ Instance found in list!' : '❌ Instance NOT found in list after creation.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testCreate();
