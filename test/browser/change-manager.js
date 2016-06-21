// native dependencies
const fs   = require('fs');
const path = require('path');

// third-party dependencies
const Bluebird = require('bluebird');

// own dependencies
const ChangeManager = require('../../lib/change-manager');

const aux = require('./auxiliary');

describe('ChangeManager', function () {

  var ASSETS;

  beforeEach(function (done) {

    ASSETS = {};

    var fixtures = document.getElementById('fixtures');
    var element  = document.createElement('div');

    element.style.height = '50vh';
    element.style.width  = '100vw';

    fixtures.appendChild(element);

    var ace = window.ace;
    var aceEditor = window.ace.edit(element);


    // make the editor start with some content
    aceEditor.insert(fs.readFileSync(__dirname + '/fixtures/webpage.html', 'utf8'));

    var cm = new ChangeManager(ace, aceEditor);

    ASSETS.aceEditor = aceEditor;
    ASSETS.cm = cm;
    ASSETS.fixtures = fixtures;
    ASSETS.element = element;

    done();
  });

  afterEach(function (done) {
    // empty fixtures
    ASSETS.element.remove();
    // ASSETS.fixtures.innerHTML = '';

    ASSETS = undefined;

    done();
  });

  describe('#hasUnsavedChanges', function () {


    it('should return true if there are changes that have not been saved yet', function () {

      ASSETS.cm.hasUnsavedChanges().should.equal(false);
      ASSETS.aceEditor.moveCursorToPosition({
        row: 0,
        column: 0
      });
      ASSETS.aceEditor.insert('Some text');
      ASSETS.cm.hasUnsavedChanges().should.equal(true);
    });

    it('should return false immediately after a reset', function () {
      ASSETS.aceEditor.moveCursorToPosition({ row: 0, column: 0 });
      ASSETS.aceEditor.insert('Some text');
      ASSETS.cm.reset();
      ASSETS.cm.hasUnsavedChanges().should.equal(false);
    });
  });

  describe('#computeUnsavedCharCount', function () {

    it('should compute changed characters before the given position', function () {
      var pos1 = {
        row: 10,
        column: 2
      };

      var text1 = '<123456789>';

      // move cursor to the position
      ASSETS.aceEditor.moveCursorToPosition(pos1);
      // insert the text at the position the cursor is
      ASSETS.aceEditor.insert(text1);

      // count unsaved characters at the pos1
      ASSETS.cm.computeUnsavedCharCount(pos1).should.equal(0);

      // count unsaved characters at the next line
      ASSETS.cm.computeUnsavedCharCount({
        row: pos1.row + 1,
        column: 0,
      }).should.equal(text1.length);
    });



    it('should ignore changes after the given position', function () {
      var pos1 = {
        row: 10,
        column: 2
      };
      var text1 = '<123456789>';

      var pos2 = {
        row: 11,
        column: 3
      };
      var text2 = '<12345>';

      var pos3 = {
        row: 40,
        column: 0
      };
      var text3 = '<12345678>';

      // move cursor to the position
      ASSETS.aceEditor.moveCursorToPosition(pos1);
      // insert the text at the position the cursor is
      ASSETS.aceEditor.insert(text1);

      ASSETS.aceEditor.moveCursorToPosition(pos2);
      ASSETS.aceEditor.insert(text2);

      ASSETS.aceEditor.moveCursorToPosition(pos3);
      ASSETS.aceEditor.insert(text3);

      // text-3 should not be counted if the position given is before it
      ASSETS.cm.computeUnsavedCharCount(pos3).should.equal(text1.length + text2.length);

      // text3 should be counted if the position given is after it
      ASSETS.cm.computeUnsavedCharCount({
        row: pos3.row,
        column: pos3.column + text3.length + 1
      }).should.equal(text1.length + text2.length + text3.length);
    });
  });

  describe('#handleChange', function () {

    it('should not create new changeAnchorSets for changes that are within changeAnchorSets that already exist', function (done) {
      var pos1 = {
        row: 10,
        column: 2
      };
      var text1 = '<123456789>';

      var pos2 = {
        row: pos1.row,
        column: pos1.column + (text1.length / 2),
      }
      var text2 = '-123-';

      var pos3 = {
        row: 20,
        column: 4
      };
      var text3 = '(123)';

      // move cursor to the position
      ASSETS.aceEditor.moveCursorToPosition(pos1);
      // insert the text at the position the cursor is
      ASSETS.aceEditor.insert(text1);

      // wait until next tick to check changeAnchorSets after insert
      process.nextTick(function () {
        ASSETS.cm._changeAreas.length.should.equal(1);

        // insert new text in the middle of the other insert
        ASSETS.aceEditor.moveCursorToPosition(pos2);
        ASSETS.aceEditor.insert(text2);

        // wait until next tick to check changeAnchorSets after insert
        process.nextTick(function () {
          ASSETS.cm._changeAreas.length.should.equal(1);
          done();
        });
      });
    });
  });

});