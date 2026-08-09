// Classic (non-module) content script.
//
// Chrome's content_scripts manifest entries do NOT support "type": "module" —
// declared content scripts are always injected as classic scripts, so a file
// using static `import` fails outright with "Cannot use import statement
// outside a module" and nothing runs.
//
// This stub is the supported workaround: a classic script that dynamically
// imports the real ES module entry point. The dynamic import resolves against
// the extension origin, so content-script.js and everything it imports must be
// listed in web_accessible_resources (see manifest.json).
(async () => {
  try {
    const url = chrome.runtime.getURL('src/content/content-script.js');
    const mod = await import(url);
    await mod.start();
  } catch (err) {
    console.error('[ESPN Draft Buddy] failed to start:', err);
  }
})();
