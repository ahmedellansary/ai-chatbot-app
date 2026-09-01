// Keys Setup Script
(function() {
  const KEYS_NEEDED = ['OPENROUTER_API_KEY', 'GROQ_API_KEY', 'GITHUB_TOKEN'];
  const allSet = KEYS_NEEDED.every(k => localStorage.getItem(k));

  if (allSet) return;

  // Base64 encoded tokens to allow smooth auto-setup
  const d1 = atob('c2stb3ItdjEtYjgyZTExNTk1ZWQwNjRlNzUxYmZmZjJiMjUxYTRjNTRjYTBkYTliYzc3OTc4NmNkYmFmOTMzZTkxNjM5OGUwMw==');
  const d2 = atob('Z3NrXzZVTFBpbFVtamhnZjBtYnUyWmxYV0dkeWIzRllrcUltS1E3bFpQZGpHSUJFUnFLckRoWCxnc2tfRUNrTzNBYUo4c0JSQW5kN2dMTU5XR2R5YjNGWVRNQk5ZSzBTeFFVNlcxQ1NYRXgyM2tvQixnc2tfUWlUaHJtdWVVT3hnUE05eGNJd25XR2R5YjNGWVZGMzdlU0xoSWc5UllUWGFrenp4YzE2bA==');
  const d3 = atob('Z2hwX0VwMmgyQzJpMExGTlZleUNTaVVGbE1NYjA1SUx6bUoybnpHR04=');

  if (!localStorage.getItem('OPENROUTER_API_KEY')) localStorage.setItem('OPENROUTER_API_KEY', d1);
  if (!localStorage.getItem('GROQ_API_KEY')) localStorage.setItem('GROQ_API_KEY', d2);
  if (!localStorage.getItem('GITHUB_TOKEN')) localStorage.setItem('GITHUB_TOKEN', d3);
})();
