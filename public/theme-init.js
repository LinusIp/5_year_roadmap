/* Runs before first paint so the page never flashes the wrong theme. Dark is the default. */
(function () {
  var theme = 'dark';
  try {
    var saved = localStorage.getItem('atlas.theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
    else if (saved === 'system') theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch (e) {
    /* storage blocked: stay dark */
  }
  document.documentElement.dataset.theme = theme;
})();
