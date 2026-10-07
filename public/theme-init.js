/* Runs before first paint so the page never flashes the wrong theme. Light is the default. */
(function () {
  var theme = 'light';
  try {
    var saved = localStorage.getItem('atlas.theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
    else if (saved === 'system') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (e) {
    /* storage blocked: stay light */
  }
  document.documentElement.dataset.theme = theme;
})();
