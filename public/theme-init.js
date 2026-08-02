/**
 * Theme bootstrap.
 *
 * Served as a static file and loaded render-blocking in <head> so the correct
 * theme class is on <html> before first paint — no flash of the wrong theme,
 * and no inline script, so a strict Content-Security-Policy stays viable.
 *
 * Kept deliberately tiny: this blocks rendering by design.
 */
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    /* localStorage unavailable (private mode, blocked cookies) — fall back to
       the light theme rather than breaking the page. */
  }
})();
