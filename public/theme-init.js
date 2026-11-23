// Apply the saved theme before first paint so dark-mode users never see a light flash.
try { if (localStorage.getItem('focused-ai-theme') === 'dark') document.documentElement.classList.add('dark') } catch (e) { /* storage blocked */ }
