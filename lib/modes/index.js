const Bluebird = require('bluebird');

exports['text/html'] = require('./html');

exports['text/css'] = require('./css');

exports['application/javascript'] = require('./javascript');

exports['text'] = {
  setup: function () {

  },
  teardown: function () {

  }
}