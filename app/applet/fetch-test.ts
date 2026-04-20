import fetch from "node-fetch";

async function main() {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/payouts/summary');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch(e) {
    console.log('Error:', e);
  }
}
main();
