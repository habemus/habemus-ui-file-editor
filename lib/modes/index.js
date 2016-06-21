const Bluebird = require('bluebird');

exports['text/html'] = require('./html');

exports['text/css'] = function (fileEditor, options) {
  // require('./css/cursor-interactions')(fileEditor, options);
  console.log('setup css mode');

  return Bluebird.resolve();
};

exports['application/javascript'] = function (fileEditor, options) {
  console.log('setup javascript mode');

  return Bluebird.resolve();
};