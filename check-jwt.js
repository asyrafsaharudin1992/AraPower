const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (key) {
  const parts = key.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('Service Role Key Payload:', payload);
  }
}
