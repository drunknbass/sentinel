// Check what token is being generated
import { generateAppleMapsToken } from './lib/apple-maps-auth.js';

console.log('Testing Apple Maps token generation:');
const token = generateAppleMapsToken();

if (token) {
  console.log('Token generated:', token);

  // Decode to check structure
  const parts = token.split('.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

  console.log('\nHeader:', header);
  console.log('Payload:', payload);
  console.log('Expires:', new Date(payload.exp * 1000).toISOString());
} else {
  console.log('No token generated!');
}