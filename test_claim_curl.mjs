import { execSync } from 'child_process';
import fetch from 'node-fetch';

async function run() {
  const authUrl = 'https://cas.anteraja.id';
  const gatewayUrl = 'https://api.anteraja.id';
  
  const loginRes = await fetch(`${authUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "50004786", password: "Password123" })
  }).catch(() => null);

  // If new API login fails, we fallback to our cas workflow using fetch_api_directly.js logic
  // Let's just execute fetch_api_directly.js, but pipe the output
}
