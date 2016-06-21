// native dependencies
const fs   = require('fs');
const path = require('path');

// third-party dependencies
const vroot = require('vroot');
const Bluebird = require('bluebird');

const FileEditor = require('../lib');

/**
 * All the DOM elements that are needed
 * @type {Object}
 */
const ELEMENTS = {
  editor: document.querySelector('#editor'),
  logs: document.querySelector('#logs'),
};

/**
 * The virtual root fs,
 * rooted at __dirname /files
 * @type {vroor}
 */
const projectFs = vroot(__dirname + '/files');

/**
 * The HFS API
 * @type {Object}
 */
var hfs = {
  readFile: Bluebird.promisify(projectFs.readFile.bind(projectFs)),
  writeFile: Bluebird.promisify(projectFs.writeFile.bind(projectFs)),
  publish: function (eventName, eventData) {
    var ev = {
      name: eventName,
      data: eventData
    };

    var pre = document.createElement('pre');
    pre.innerHTML = JSON.stringify(ev, null, '\t');

    ELEMENTS.logs.insertBefore(pre, ELEMENTS.logs.childNodes[0]);
  }
}

/**
 * Instantiate a FileEditor
 * @type {FileEditor}
 */
var editor = new FileEditor({
  ace: window.ace,
  element: ELEMENTS.editor,
  hfs: hfs,
});

// load the index.html file
editor.load('index.html')
  .then(function () {
    console.log('loaded');
  });

////////////////////
// setup Keypress //
var listener = new window.keypress.Listener();

listener.simple_combo('cmd s', function() {
  editor.save()
    .then(function () {
      console.log('saved');
    });
});

listener.simple_combo('ctrl s', function() {
  editor.save()
    .then(function () {
      console.log('saved');
    });
});