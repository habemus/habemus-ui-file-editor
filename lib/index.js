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
 * @param {Ace Editor singleton} ace
 * @param {DOMElement} element
 * @param {HDev api} hDev
 */
function FileEditor(ace, element, hDev) {

  if (!ace) { throw new Error('ace is required'); }
  if (!element) { throw new Error('element is required'); }
  if (!hDev) { throw new Error('hDev is required'); }

  if (typeof hDev.readFile !== 'function') {
    throw new TypeError('hDev.readFile must be a function');
  }
  if (typeof hDev.updateFile !== 'function') {
    throw new TypeError('hDev.updateFile must be a function');
  }
  if (typeof hDev.createFile !== 'function') {
    throw new TypeError('hDev.createFile must be a function');
  }
  if (typeof hDev.subscribe !== 'function') {
    throw new TypeError('hDev.subscribe must be a function');
  }
  if (typeof hDev.publish !== 'function') {
    throw new TypeError('hDev.publish must be a function');
  }
  if (typeof hDev.startWatching !== 'function') {
    throw new TypeError('hDev.startWatching must be a function');
  }
  if (typeof hDev.stopWatching !== 'function') {
    throw new TypeError('hDev.stopWatching must be a function');
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
  this.hDev = hDev;
  // subscribe to events on hDev
  // TODO: make the subscription be scoped to the actual file
  hDev.subscribe('file-removed', function (data) {
    if (data.path === this.filepath) {
      // set the loadedFileIsNew flag
      this.loadedFileIsNew = true;
      this.emit('loaded-file-removed', data);
    }

  }.bind(this));
  hDev.subscribe('file-updated', function (data) {
    if (data.path === this.filepath) {
      this.emit('loaded-file-updated', data);
    }
  }.bind(this));

  /**
   * Flag that defines whether the current
   * loaded file is new and needs to be created
   * @type {Boolean}
   */
  this.loadedFileIsNew = undefined;

  /**
   * Path to the file that this FileEditor represents
   * @type {String}
   */
  this.filepath = undefined;

  /**
   * Mode of the editor
   * We use mimeTypes for mode names.
   * This decision may reveal itself dumb (ace does not)
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
 * Loads a file into the editor via hDev.readFile
 * @param  {String} filepath
 * @param  {Object} options
 * @return {Bluebird}
 */
FileEditor.prototype.load = function (filepath, options) {
  var self = this;

  // unload
  self.unload();

  // set the new filepath
  self.filepath = filepath;

  // get the mimeType of the file based on filepath
  var mimeType = mime.lookup(filepath);

  // ace modelist
  var modelist = self.ace.require("ace/ext/modelist");

  return self.hDev.readFile(self.filepath)
    .then(function (contents) {
      // get the aceMode
      var aceMode = modelist.getModeForPath(filepath).mode;
      
      // create the session and attach it to the editor
      var editSession = self.ace.createEditSession(new Buffer(contents).toString(), aceMode);
      editSession.setTabSize(2);
      self.aceEditor.setSession(editSession);
      self.aceEditor.setOption('wrap', 80);

      // let hDev start watching for changes on this file
      self.hDev.startWatching(self.filepath);
    })
    .then(function () {
      return self.setMode(mimeType);
    });
};

FileEditor.prototype.unload = function () {
  // let hDev stop watching for changes on the filepath
  // that was set onto the file editor
  if (this.filepath) {
    this.hDev.stopWatching(this.filepath);
  }
};

/**
 * Saves the document attached to the editor via hDev.updateFile
 * @return {Bluebird}
 */
FileEditor.prototype.save = function () {

  var filepath = this.filepath;
  if (!filepath) { throw new Error('no file loaded'); }

  // check if there are any unsaved changes
  if (this.changeManager.hasUnsavedChanges()) {

    return this.hDev.updateFile(filepath, this.aceEditor.getValue())
      .catch(function (err) {
        if (err.name === 'PathDoesNotExist') {

          // TODO: implement prompting to ask if user wants to create the file
          // for now, simply create the file
          return this.hDev.createFile(filepath, this.aceEditor.getValue());

        } else {
          return Bluebird.reject(err);
        }
      }.bind(this))
      .then(function () {

        this.changeManager.reset();

      }.bind(this));

  } else if (this.loadedFileIsNew) {
    // the file is new, thus we must create it using the editor's contents
    return this.hDev.createFile(filepath, this.aceEditor.getValue())
      .then(function () {
        this.changeManager.reset();
      }.bind(this));

  } else {
    // nothing to save
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