/**
 * Google Analytics 4 bootstrap.
 *
 * External rather than inline so the CSP does not need 'unsafe-inline'.
 * The measurement ID is read from this script tag's own data attribute, so the
 * file itself contains no site-specific configuration.
 */
(function () {
  var el = document.currentScript;
  var id = el && el.getAttribute('data-ga-id');
  if (!id) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', id, {
    anonymize_ip: true,
    send_page_view: true,
  });
})();
