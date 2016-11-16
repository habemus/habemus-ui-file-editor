// third-party dependencies
const Bluebird = require('bluebird');

exports.setup = function (fileEditor, options) {

  return Bluebird.all([
    require('./autocomplete')(fileEditor, options),
  ])
  .then(function (teardownFns) {
    return function teardown() {
      return Bluebird.all(teardownFns.map(function (fn) {
        return fn();
      }));
    };
  });
};
