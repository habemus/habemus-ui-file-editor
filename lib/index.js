// native dependencies
const util         = require('util');
const EventEmitter = require('events');

// third-party dependencies
const mime     = require('mime');
const Bluebird = require('bluebird');

// own dependencies
const aux = require('./auxiliary');
const ChangeManager = require('./change-manager');

const H_MODES = require('./modes');

/**
 * FileEditor constructor
 * Is instance of EventEmitter
 * @param {[type]} ace     [description]
 * @param {[type]} element [description]
 * @param {[type]} hfs     [description]
 */
function FileEditor(ace, element, hfs) {

  if (!ace) { throw new Error('ace is required'); }
  if (!element) { throw new Error('element is required'); }
  if (!hfs) { throw new Error('hfs is required'); }

  if (typeof hfs.readFile !== 'function') {
    throw new TypeError('hfs.readFile must be a function');
  }
  if (typeof hfs.writeFile !== 'function') {
    throw new TypeError('hfs.writeFile must be a function');
  }
  if (typeof hfs.publish !== 'function') {
    throw new TypeError('hfs.publish must be a function');
  }

  /**
   * Reference to the ace editor constructor
   * @type {ace}
   */
  this.ace = ace;

  /**
   * The DOM element the ace editor will be rendered on
   * @type {DOMElement}
   */
  this.element = (typeof element === 'string') ? 
    document.querySelector(element) : element;

  /**
   * The ace editor
   * @type {ACE Editor}
   */
  this.aceEditor = this.ace.edit(this.element);
  this.aceEditor.on('change', this.emit.bind(this, 'change'));

  /**
   * The HFS API to be used by the file editor UI.
   * @type {HFS}
   */
  this.hfs = hfs;

  /**
   * Path to the file that this FileEditor represents
   * @type {String}
   */
  this.filepath = undefined;

  /**
   * Mode of the editor
   * We use mimeTypes for mode names.
   * This decision may reveal itself dumb (e.g. ace does not)
   * in the future, but for now
   * (20 Jun 2016)
   * it seems quite good!
   * 
   * @type {String}
   */
  this.mode = undefined;

  /**
   * Property where the modeTeardown function should be stored
   * @type {Function}
   */
  this._modeTeardown = undefined;

  /**
   * The changeManager keeps track of changes on the document
   * attached to the editor.
   * 
   * @type {ChangeManager}
   */
  this.changeManager = new ChangeManager(this.ace, this.aceEditor);
};

util.inherits(FileEditor, EventEmitter);

/**
 * Loads a file into the editor via hfs.readFile
 * @param  {String} filepath
 * @param  {Object} options
 * @return {Bluebird}
 */
FileEditor.prototype.load = function (filepath, options) {

  var self = this;

  this.filepath = filepath;

  // get the mimeType of the file based on filepath
  var mimeType = mime.lookup(filepath);

  // ace modelist
  var modelist = this.ace.require("ace/ext/modelist");

  return this.hfs.readFile(this.filepath)
    .then(function (contents) {
      // get the aceMode
      var aceMode = modelist.getModeForPath(filepath).mode;
      
      // create the session and attach it to the editor
      var editSession = self.ace.createEditSession(new Buffer(contents).toString(), aceMode);
      editSession.setTabSize(2);
      self.aceEditor.setSession(editSession);
      self.aceEditor.setOption('wrap', 80);

    })
    .then(function () {
      return self.setMode(mimeType);
    });
};

/**
 * Saves the document attached to the editor via hfs.writeFile
 * @return {Bluebird}
 */
FileEditor.prototype.save = function () {

  var filepath = this.filepath;
  if (!filepath) { throw new Error('no file loaded'); }

  // check if there are any unsaved changes
  if (this.changeManager.hasUnsavedChanges()) {

    return this.hfs.writeFile(filepath, this.aceEditor.getValue())
      .then(function () {

        this.changeManager.reset();

      }.bind(this));

  } else {
    console.log('nothing to save')
    return Bluebird.resolve();
  }
};

/**
 * Sets the mode and the MODE the file editor is in.
 * @param {String} mode
 * @return {Bluebird -> undefined} A promise that is fulfilled once the mode
 *                                 setup is done.
 */
FileEditor.prototype.setMode = function (newMode, options) {

  var self = this;

  var previousMode = this.mode;
  var hasChanged   = previousMode && (previousMode !== newMode);

  this.mode = newMode;

  var _mode = H_MODES[newMode] || H_MODES['text'];

  if (hasChanged) {
    // teardown old active mode and setup new one
    return Bluebird.resolve(this._modeTeardown())
      .then(function () {
        return _mode.setup(self, options);
      })
      .then(function (modeTeardown) {
        // save reference to the new mode teardown function
        self._modeTeardown = modeTeardown;

        return;
      });
  } else {
    // just set up
    return Bluebird.resolve(_mode.setup(this, options))
      .then(function (modeTeardown) {
        // save reference to the new mode teardown function
        self._modeTeardown = modeTeardown;

        return;
      });
  }
};

module.exports = FileEditor;