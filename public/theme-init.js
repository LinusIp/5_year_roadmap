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
  /* The last daily scene's palette (ATLAS-DAILY-SCENES), so the first paint carries it; the app re-applies the day's. */
  try {
    var scene = JSON.parse(localStorage.getItem('atlas.scene') || 'null');
    if (scene && scene[theme]) {
      var tokens = scene[theme];
      for (var name in tokens) document.documentElement.style.setProperty(name, tokens[name]);
      document.documentElement.dataset.scene = scene.id;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta && scene.canvas) meta.setAttribute('content', scene.canvas[theme]);
    }
  } catch (e) {
    /* no scene stored, or storage blocked */
  }
})();
