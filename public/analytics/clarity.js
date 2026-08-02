/**
 * Microsoft Clarity loader.
 *
 * External rather than inline so the CSP does not need 'unsafe-inline'.
 * The project ID is read from this script tag's own data attribute.
 */
(function () {
  var el = document.currentScript;
  var id = el && el.getAttribute('data-clarity-id');
  if (!id) return;

  window.clarity =
    window.clarity ||
    function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.clarity.ms/tag/' + id;
  document.head.appendChild(s);
})();
