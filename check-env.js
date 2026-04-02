import fetch from 'node-fetch';

async function check() {
  try {
    const res = await fetch('http://localhost:3000/api/debug/supabase');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

check();
