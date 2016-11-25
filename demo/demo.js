// native dependencies
const fs   = require('fs');
const path = require('path');

// third-party dependencies
const Bluebird = require('bluebird');

const FileEditor = require('../lib');

/**
 * All the DOM elements that are needed
 * @type {Object}
 */
const ELEMENTS = {
  editor: document.querySelector('#editor'),
  logs: document.querySelector('#logs'),
  fileSelector: document.querySelector('#file')
};

// the hDev api
var hDev = require('./api/h-dev');

/**
 * Overwrite publish method so that we may log the published info
 */
hDev.publish = function (eventName, eventData) {
  var ev = {
    name: eventName,
    data: eventData
  };

  var pre = document.createElement('pre');
  pre.innerHTML = JSON.stringify(ev, null, '  ') + '\n--';

  ELEMENTS.logs.insertBefore(pre, ELEMENTS.logs.childNodes[0]);
};

/**
 * Instantiate a FileEditor
 * @type {FileEditor}
 */
var fileEditor = new FileEditor(window.ace, ELEMENTS.editor, hDev);

// load the index.html file
fileEditor.load(ELEMENTS.fileSelector.value)
  .then(function () {
    // clear the logs
    console.log('loaded');
  });


///// CONTROLS

// File selection
ELEMENTS.fileSelector.addEventListener('change', function (e) {
  fileEditor.load(ELEMENTS.fileSelector.value)
    .then(function () {
      ELEMENTS.logs.innerHTML = '';
      console.log('loaded ' + ELEMENTS.fileSelector.value);
    });
});

////////////////////
// setup Keypress //
var listener = new window.keypress.Listener();

listener.simple_combo('cmd s', function() {
  fileEditor.save()
    .then(function () {
      console.log('saved');
    });
});

listener.simple_combo('ctrl s', function() {
  fileEditor.save()
    .then(function () {
      console.log('saved');
    });
});