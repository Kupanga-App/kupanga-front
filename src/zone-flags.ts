// Chargé AVANT zone.js (angular.json polyfills).
// Empêche Zone.js de patcher les events unload/beforeunload (dépréciés, bloquent le BFCache).
(window as any)['__Zone_ignore_on_properties'] = [
  { target: window.constructor.prototype, ignoreProperties: ['unload', 'beforeunload'] },
];
