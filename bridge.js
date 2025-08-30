// === bridge.js (Front-end adapter for Vercel) ===
// Emulates google.script.run chaining API using fetch() to your GAS Web App.
// Usage: keep your existing code that calls google.script.run... and just include this file.

(function(){
  if (typeof window === 'undefined') return;

  // Configure via global vars or Vercel env-injected <script> before this file:
  // window.GAS_URL = 'https://script.google.com/macros/s/XXXXX/exec'
  // window.API_KEY = 'your-secret';
  const GAS_URL =
    (typeof window.NEXT_PUBLIC_GAS_URL !== 'undefined' && window.NEXT_PUBLIC_GAS_URL) ||
    (typeof window.GAS_URL !== 'undefined' && window.GAS_URL) ||
    'https://SCRIPT_ID_HERE/exec'; // TODO: replace or set via env

  const API_KEY =
    (typeof window.NEXT_PUBLIC_API_KEY !== 'undefined' && window.NEXT_PUBLIC_API_KEY) ||
    (typeof window.API_KEY !== 'undefined' && window.API_KEY) || '';

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

  // Parameter mappers for two-arg methods
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

  // Chainable wrapper to mimic withSuccessHandler/withFailureHandler
  function Runner() {
    this._onSuccess = function(){};
    this._onFailure = function(){};
  }
  Runner.prototype.withSuccessHandler = function(fn){ this._onSuccess = fn || function(){}; return this; };
  Runner.prototype.withFailureHandler = function(fn){ this._onFailure = fn || function(){}; return this; };

  const runnerProto = Runner.prototype;

  // Proxy to capture arbitrary method names like getEmployerNames(), addEmployer(payload), etc.
  const handler = {
    get(target, prop) {
      if (prop in target) return target[prop];
      // Return a function that triggers the REST call when invoked
      return function(...args){
        try {
          let params = {};
          if (args.length === 0) {
            // no params
          } else if (args.length === 1) {
            if (oneArgParamMap[prop]) params = oneArgParamMap[prop](args[0]);
            else params = args[0];
          } else if (args.length >= 2) {
            if (twoArgParamMap[prop]) params = twoArgParamMap[prop](args[0], args[1]);
            else params = { a0: args[0], a1: args[1] };
          }
          return call(prop, params).then(this._onSuccess).catch(this._onFailure);
        } catch (err) {
          this._onFailure(err);
        }
      };
    }
  };

  const runProxy = new Proxy(runnerProto, { get: (t,p)=>runnerProto[p] });
  function makeRunner(){ return new Proxy(new Runner(), handler); }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', {
    get: () => makeRunner()
  });

  // Optional: expose call() for direct usage in new code
  window.__gas_call__ = call;
})();