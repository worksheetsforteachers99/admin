
// === bridge.strict.js ===
// Same as bridge.js, but refuses to run if GAS_URL is missing or placeholder.

(function(){
  if (typeof window === 'undefined') return;

  const GAS_URL =
    (typeof window.NEXT_PUBLIC_GAS_URL !== 'undefined' && window.NEXT_PUBLIC_GAS_URL) ||
    (typeof window.GAS_URL !== 'undefined' && window.GAS_URL) || '';

  const API_KEY =
    (typeof window.NEXT_PUBLIC_API_KEY !== 'undefined' && window.NEXT_PUBLIC_API_KEY) ||
    (typeof window.API_KEY !== 'undefined' && window.API_KEY) || '';

  if (!GAS_URL || GAS_URL.includes('SCRIPT_ID_HERE')) {
    const msg = 'GAS_URL is not set. Add in index.html before bridge.strict.js: window.GAS_URL = "https://script.google.com/macros/s/AKfycb.../exec"';
    console.error(msg);
    // show user-friendly message on page
    try {
      var warn = document.createElement('div');
      warn.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;background:#111;color:#fff;padding:10px 12px;border-radius:10px;z-index:9999;font:14px/1.3 system-ui;";
      warn.textContent = msg;
      document.body.appendChild(warn);
      setTimeout(()=>warn.remove(), 6000);
    } catch(_) {}
    return;
  }

  function call(action, params) {
    return fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
      body: JSON.stringify({ action, params: params || {}, key: API_KEY })
    }).then(res => res.json()).then(json => {
      if (!json || !json.ok) throw new Error((json && json.error) || 'Request failed');
      return json.data;
    });
  }

  const twoArgParamMap = {
    updateEmployer: (a, b) => ({ originalName: a, payload: b }),
    updateDataAccount: (a, b) => ({ originalName: a, payload: b }),
    updateLesson: (a, b) => ({ originalCode: a, payload: b }),
  };

  const oneArgParamMap = {
    sendCredentialsEmail: (name) => ({ name }),
    getEmployerDetailsByName: (name) => ({ name }),
    removeEmployer: (name) => ({ name }),
    removeDataAccount: (name) => ({ name }),
    removeLesson: (code) => ({ code }),
    addEmployer: (payload) => payload,
    addDataAccount: (payload) => payload,
    addLesson: (payload) => payload,
  };

  function Runner() {
    this._onSuccess = function(){};
    this._onFailure = function(){};
  }
  Runner.prototype.withSuccessHandler = function(fn){ this._onSuccess = fn || function(){}; return this; };
  Runner.prototype.withFailureHandler = function(fn){ this._onFailure = fn || function(){}; return this; };

  const handler = {
    get(target, prop) {
      if (prop in target) return target[prop];
      return function(...args){
        try {
          let params = {};
          if (args.length === 0) {
          } else if (args.length === 1) {
            params = (oneArgParamMap[prop] ? oneArgParamMap[prop](args[0]) : args[0]);
          } else if (args.length >= 2) {
            params = (twoArgParamMap[prop] ? twoArgParamMap[prop](args[0], args[1]) : { a0: args[0], a1: args[1] });
          }
          return call(prop, params).then(this._onSuccess).catch(this._onFailure);
        } catch (err) {
          this._onFailure(err);
        }
      };
    }
  };

  function makeRunner(){ return new Proxy(new Runner(), handler); }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', { get: () => makeRunner() });
  window.__gas_call__ = call;
})();
