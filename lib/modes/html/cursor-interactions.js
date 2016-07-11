// own
const aux = require('../../auxiliary');

const CURSOR_POSITION_CHANGE = 'cursor-position-change';
const MIME_TYPE = 'text/html';

module.exports = function (fileEditor, options) {
  /**
   * Publishes an event with the position and filepath
   */
  function _publishPosition(eventName, position) {

    var posIsWithinChangeArea = fileEditor.changeManager.isPositionWithinChangeArea(position);

    if (posIsWithinChangeArea) {
      // ignore any cursor movements within a change area.
      return;
    } else {

      var doc = fileEditor.aceEditor.getSession().getDocument();

      var unsavedChars = fileEditor.changeManager.computeUnsavedCharCount(position);
      var cursorIndex  = doc.positionToIndex(position) - unsavedChars;

      fileEditor.hDev.publish(eventName, {
        f: fileEditor.filepath,
        p: position,
        c: cursorIndex,
        mode: MIME_TYPE,
      });
    }
  }

  /**
   * Executed whenever the aceEditor emits a 'blur' event
   */
  function onEditorBlur() {
    _publishPosition(CURSOR_POSITION_CHANGE, {});
  }

  /**
   * Executed whenever the cursor is moved in the editor
   */
  function onSelectionChangeCursor() {
    var cursorPos = fileEditor.aceEditor.getCursorPosition();

    _publishPosition(CURSOR_POSITION_CHANGE, cursorPos);
  }

  // attach event listeners
  var aceEditor    = fileEditor.aceEditor;
  var aceSession   = fileEditor.aceEditor.getSession();
  var aceSelection = aceSession.getSelection();

  aceEditor.on('blur', onEditorBlur);
  aceSelection.on('changeCursor', onSelectionChangeCursor);

  // return the teardown function
  return function teardown() {
    aceEditor.off('blur', onEditorBlur);
    aceSelection.off('changeCursor', onSelectionChangeCursor);
  };
};