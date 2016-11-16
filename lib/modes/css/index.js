// third-party dependencies
const Bluebird = require('bluebird');

// own deps
const cursorInteractions = require('./cursor-interactions');
// const mouseInteractions  = require('./mouse-interactions');
const autocomplete       = require('./autocomplete');

exports.setup = function (fileEditor, options) {

  return Bluebird.all([
    cursorInteractions(fileEditor, options),
    // mouseInteractions(fileEditor, options),
    autocomplete(fileEditor, options),
  ])
  .then(function (teardownFns) {
    return function teardown() {
      return Bluebird.all(teardownFns.map(function (fn) {
        return fn();
      }));
    };
  });
};

// exports.name = 'text/css';