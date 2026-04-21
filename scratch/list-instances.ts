
async function listInstances() {
  const url = 'http://35.172.170.210:8080/instance/fetchInstances';
  const apikey = 'ImobIA_Sec_2024_!';
  
  console.log('Fetching all instances...');
  try {
    const res = await fetch(url, { headers: { 'apikey': apikey } });
    const data = await res.json();
    console.log('Instances:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

listInstances();
