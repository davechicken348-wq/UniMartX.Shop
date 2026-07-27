/* Seller OS — application-shell pre-paint hook.
   Runs synchronously in <head> (no defer/async) so the
   correct sidebar state is applied BEFORE first paint.
   This prevents the expanded→collapsed flash on navigation. */
(function () {
  'use strict';
  try {
    if (localStorage.getItem('seller_sidebar_collapsed') === 'true') {
      document.documentElement.classList.add('no-transition');
    }
  } catch (e) { /* storage unavailable */ }
})();
