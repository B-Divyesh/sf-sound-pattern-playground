(() => {
  const params = new URLSearchParams(window.location.search);
  const isDemo = window.location.pathname === '/demo' || window.location.pathname === '/demo/' || params.get('demo') === '1';
  if (isDemo) document.documentElement.classList.add('demo-mode');
})();
