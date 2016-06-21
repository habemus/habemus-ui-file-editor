// own dependencies
const ChangeArea = require('./change-area');

/**
 * ChangeManager constructor
 * @param {Ace} ace The ace editor constructor
 * @param {AceEditor} aceEditor AceEditor instance this change manager should be related to
 */
function ChangeManager(ace, aceEditor, options) {

  if (!ace) { throw new Error('ace is required'); }
  if (!aceEditor) { throw new Error('aceEditor is required'); }

  this.ace = ace;
  this.Range = ace.require('ace/range').Range;

  this.aceEditor = aceEditor;

  // associate the editor to the change manager
  this.aceEditor.on('change', this.handleChange.bind(this));
  this.aceEditor.on('changeSession', this.reset.bind(this));

  this.reset();
}

/**
 * Resets the changeManager to its initial state
 */
ChangeManager.prototype.reset = function () {
  // empty the _unsavedChanges
  this._unsavedChanges = [];

  // empty the _unsavedChangeAnchorSets
  // this._unsavedChangeAnchorSets = [];

  // empty the changeAreas
  this._changeAreas = [];
};

/**
 * Method to be attached to the 'change' event of the ace editor
 * @param  {ChangeObject} aceChange
 */
ChangeManager.prototype.handleChange = function (aceChange) {

  this._unsavedChanges.push(aceChange);

  var self = this;

  // create a change area for inserts
  // if needed
  // 
  // We must leave the changeArea addition to the next tick
  // because ace only updates anchors after the change
  // event callbacks are done
  if (aceChange.action === 'insert') {
    setTimeout(function () {

      if (!self.isChangeWithinChangeArea(aceChange)) {
        // the change should create a new change area
        var changeArea = new ChangeArea(self.ace, self.aceEditor, {
          start: aceChange.start,
          end: aceChange.end
        });

        self._changeAreas.push(changeArea);

      } else {
        // the change is already within a changeArea
      }

    }, 0);
  }

};

/**
 * Verify if there are unsaved changes listed
 * @return {Boolean}
 */
ChangeManager.prototype.hasUnsavedChanges = function () {
  return this._unsavedChanges.length > 0;
};

/**
 * Retrieves the changeArea that contains the given aceChange
 * @param  {AceChange} aceChange
 * @return {AnchorSet}
 */
ChangeManager.prototype.isChangeWithinChangeArea = function (aceChange) {
  return this._changeAreas.some(function (changeArea) {
    return changeArea.containsChange(aceChange);
  });
}

/**
 * Checks whether the position is within a changeArea
 * @param  {Position} position
 *         - row: Number
 *         - column: Number
 * @return {AnchorSet}
 */
ChangeManager.prototype.isPositionWithinChangeArea = function (position) {
  return this._changeAreas.some(function (changeArea) {
    return changeArea.containsPosition(position);
  });
}

/**
 * Retrieves the changeArea that contains a given position
 * @param  {Position} position
 *         - row: Number
 *         - column: Number
 * @return {AnchorSet}
 */
ChangeManager.prototype.findChangeAreaForPosition = function (position) {
  return this._changeAreas.find(function (changeArea) {
    return changeArea.containsPosition(position);
  });
};

/**
 * Computes the quantity of unsaved characters that exist
 * BEFORE the given position
 *
 * Does not use the concept of ChangeAreas,
 * only the _unsavedChanges positions
 * 
 * @param  {Position} position
 *         - row: Number
 *         - column: Number
 * @return {Number}
 */
ChangeManager.prototype.computeUnsavedCharCount = function (position) {

  var Range = this.Range;

  var doc           = this.aceEditor.getSession().getDocument();
  var newLineLength = doc.getNewLineCharacter().length;

  return this._unsavedChanges.reduce(function (unsavedCharCount, aceChange) {

    // [1] check if the change affects the given position
    var changeRange = new Range(
      aceChange.start.row,
      aceChange.start.column,
      aceChange.end.row,
      aceChange.end.column
    );

    // [2] check whether the change is relevant for the given position 
    var isChangeRelevant;

    if (aceChange.action === 'insert') {
      // TODO improve this logic
      // MAYBE:
      // to take into consideration
      // that the position may be inside a change range...
      // consider only changes before the position
      isChangeRelevant = changeRange.compare(position.row, position.column) > 0;
    } else if (aceChange.action === 'remove') {
      // consider changes before AND with the position inside of it
      isChangeRelevant = changeRange.compare(position.row, position.column) >= 0;
    }

    if (!isChangeRelevant) {
      // ignore change
      return unsavedCharCount;
    } else {
      var changeText = aceChange.lines.join(doc.getNewLineCharacter());
      var changeCharCount = changeText.length;

      if (aceChange.action === 'insert') {
        return unsavedCharCount + changeCharCount;
      } else {
        return unsavedCharCount - changeCharCount;
      }
    }
  }, 0);

}

module.exports = ChangeManager;