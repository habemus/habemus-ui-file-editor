// own
const aux = require('../../auxiliary');

module.exports = function (fileEditor, options) {

  /**
   * Holds the last published position object
   * so that same positions are not published.
   */
  var _lastPublishedPosition;

  /**
   * Publishes an event with the position and filepath
   */
  function _publishPosition(eventName, position) {

    if (_lastPublishedPosition &&
      position.row === _lastPublishedPosition.row &&
      position.column === _lastPublishedPosition.column) {
      return;
    }

    var posIsWithinChangeArea = fileEditor.changeManager.isPositionWithinChangeArea(position);

    if (posIsWithinChangeArea) {
      // ignore any cursor movements within a change area.
      return;
    }

    var doc = fileEditor.aceEditor.getSession().getDocument();

    var unsavedChars = fileEditor.changeManager.computeUnsavedCharCount(position);
    var cursorIndex  = doc.positionToIndex(position) - unsavedChars;

    fileEditor.hfs.publish(eventName, {
      filepath: fileEditor.filepath,
      position: cursorIndex
    });

    // save the _lastPublishedPosition
    _lastPublishedPosition = position;
  }

  /**
   * Executed when the mouse moves on the editor container element
   * @param  {Event} e
   */
  function onContainerMousemove(e) {
    var docPos = aux.aceGetDocPosFromPixelPos(fileEditor.aceEditor, {
      left: e.clientX,
      top: e.clientY
    });

    _publishPosition('mouse-position-change', docPos);
  }

  /**
   * Executed when teh mouse leaves the editor container element
   * @param  {Event} e
   */
  function onContainerMouseleave(e) {
    _publishPosition('mouse-position-change', {});
  }

  var aceEditor    = fileEditor.aceEditor;
  var aceContainer = aceEditor.container;

  aceContainer.addEventListener('mousemove', onContainerMousemove);
  aceContainer.addEventListener('mouseleave', onContainerMouseleave);

  // return the teardown function
  return function teardown() {
    aceContainer.removeEventListener('mousemove', onContainerMousemove);
    aceContainer.removeEventListener('mouseleave', onContainerMouseleave);
  };
}