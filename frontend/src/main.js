// Minimal bootstrap to verify deployment works.
// Later, import your real app code here (e.g., `import './script.js'`).

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div style="font-family:ui-sans-serif,system-ui,Arial;padding:24px">
      <h1>PestiLab is live 🎉</h1>
      <p>If you see this, Vite + Vercel setup works.</p>
      <p>Next: import your real app code into <code>src/main.js</code>.</p>
    </div>
  `;
  console.log('PestiLab boot OK');
} else {
  console.warn('#app element not found');
}
