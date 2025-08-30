
// === bridge.nopreflight.js ===
// Uses only 'Content-Type: text/plain' and NO custom headers to avoid CORS preflight.
// Put API_KEY in the body instead of a header.

(function(){
  if (typeof window === 'undefined') return;

  const GAS_URL =
    (typeof window.NEXT_PUBLIC_GAS_URL !== 'undefined' && window.NEXT_PUBLIC_GAS_URL) ||
    (typeof window.GAS_URL !== 'undefined' && window.GAS_URL) || '';

  const API_KEY =
    (typeof window.NEXT_PUBLIC_API_KEY !== 'undefined' && window.NEXT_PUBLIC_API_KEY) ||
    (typeof window.API_KEY !== 'undefined' && window.API_KEY) || '';

  if (!GAS_URL) {
    console.error('GAS_URL is not set. Add in index.html before this file: window.GAS_URL = "https://script.google.com/macros/s/AKfycb.../exec"');
    return;
  }

  function call(action, params) {
    const body = JSON.stringify({ action, params: params || {}, key: API_KEY });
    return fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' }, // simple request, no preflight
      body
    })
    .then(res => res.json())
    .then(json => {
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

  function Runner() { this._onSuccess = function(){}; this._onFailure = function(){}; }
  Runner.prototype.withSuccessHandler = function(fn){ this._onSuccess = fn || function(){}; return this; };
  Runner.prototype.withFailureHandler = function(fn){ this._onFailure = fn || function(){}; return this; };

  const handler = {
    get(target, prop) {
      if (prop in target) return target[prop];
      return function(...args){
        try {
          let params = {};
          if (args.length === 1) params = (oneArgParamMap[prop] ? oneArgParamMap[prop](args[0]) : args[0]);
          else if (args.length >= 2) params = (twoArgParamMap[prop] ? twoArgParamMap[prop](args[0], args[1]) : { a0: args[0], a1: args[1] });
          return call(prop, params).then(this._onSuccess).catch(this._onFailure);
        } catch (err) { this._onFailure(err); }
      };
    }
  };

  function makeRunner(){ return new Proxy(new Runner(), handler); }
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', { get: () => makeRunner() });
  window.__gas_call__ = call;
})();
