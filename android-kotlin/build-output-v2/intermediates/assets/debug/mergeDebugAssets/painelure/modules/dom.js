(function () {
  function $(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function $all(selector, scope = document) {
    return [...scope.querySelectorAll(selector)];
  }

  window.PainelURE = window.PainelURE || {};
  window.PainelURE.$ = $;
  window.PainelURE.$all = $all;
})();
