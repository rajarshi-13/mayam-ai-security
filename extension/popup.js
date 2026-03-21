document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loader = document.getElementById('loader');
  const resultContainer = document.getElementById('result');
  const hero = document.querySelector('.hero');

  analyzeBtn.addEventListener('click', async () => {
    // UI Transitions
    hero.classList.add('hidden');
    loader.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    try {
      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab.url;
      const pageTitle = tab.title;

      // 🛑 Explicit Safe Check (Whitelist)
      const safeUrls = [
        'chrome://newtab/', 
        'http://127.0.0.1:8000/', 
        'http://localhost:5173/'
      ];

      if (safeUrls.some(safe => currentUrl.startsWith(safe)) || currentUrl === 'about:blank') {
        renderResult({
          category: 'safe',
          risk_score: 0,
          explanation: "This is a verified internal or development URL. MAYAM considers it 100% safe.",
          recommended_action: "No action required. This is part of your trusted workspace."
        }, currentUrl);
        loader.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/analyze/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          content: currentUrl,
          metadata: {
            title: pageTitle
          }
        })
      });

      const data = await response.json();
      renderResult(data, currentUrl);
    } catch (error) {
      console.error('Analysis failed:', error);
      renderError("MAYAM Backend is offline. Please start the backend server.");
    } finally {
      loader.classList.add('hidden');
      resultContainer.classList.remove('hidden');
    }
  });

  function renderResult(data, url) {
    const category = data.category.toLowerCase();
    const score = data.risk_score;
    
    // Map categories to user-friendly labels if needed
    let displayCategory = category;
    if (category === 'threat') displayCategory = 'High Risk';

    // Simple domain extraction for display
    let domain = "Unknown Site";
    try {
      domain = new URL(url).hostname;
    } catch(e) {}
    
    resultContainer.innerHTML = `
      <div class="result-card ${category}">
        <div class="risk-header">
          <div class="site-info">
            <span class="verdict-badge">${displayCategory}</span>
            <p class="site-domain" style="font-size: 10px; color: var(--text-muted); margin-top: 4px; font-weight: 500;">${domain}</p>
          </div>
          <div class="risk-score-circle">
            <span class="risk-score-value">${score}</span>
            <span class="risk-score-label">Risk</span>
          </div>
        </div>
        
        <p class="explanation">${data.explanation}</p>
        
        <div class="action-box">
          <span class="action-label">Recommended Action</span>
          <p class="action-text">${data.recommended_action}</p>
        </div>

        <button id="reAnalyzeBtn" class="secondary-btn" style="margin-top: 15px; width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text-muted); cursor: pointer; font-size: 12px;">
          Scan Another Site
        </button>
      </div>
    `;

    document.getElementById('reAnalyzeBtn').addEventListener('click', () => {
      resultContainer.classList.add('hidden');
      hero.classList.remove('hidden');
    });
  }

  function renderError(message) {
    resultContainer.innerHTML = `
      <div class="result-card threat" style="border-color: var(--threat)">
        <p class="explanation" style="color: var(--threat); font-weight: 600;">Connection Error</p>
        <p class="action-text" style="font-size: 12px; color: var(--text-muted);">${message}</p>
        <button id="retryBtn" class="primary-btn" style="margin-top: 15px;">Retry Connection</button>
      </div>
    `;
    document.getElementById('retryBtn').addEventListener('click', () => {
      resultContainer.classList.add('hidden');
      hero.classList.remove('hidden');
    });
  }
});
