/**
 * Defines logic for managing a change area
 *
 * A change is defined by two anchors:
 * one at the start of the change area
 * and one at the end of the change area.
 *
 * Text within the change area cannot be 'viewed'
 * at the preview, as it has not been rendered yet.
 * 
 * @param {Ace} ace The ace editor global.
 * @param {AceEditor} aceEditor Instance of ace editor this changeArea is related to
 * @param {Object} options
 *        - start: Position { row: Number, column: Number }
 *        - end: Position { row: Number, column: Number }
 */
function ChangeArea(ace, aceEditor, options) {
  if (!ace) { throw new Error('ace is required'); }
  if (!aceEditor) { throw new Error('aceEditor is required'); }
  if (!options.start) { throw new Error('options.start is required'); }
  if (!options.end) { throw new Error('options.end is required'); }

  this.ace = options.ace;
  this.Range = ace.require('ace/range').Range;

  this.aceEditor = aceEditor;

  var doc = this.aceEditor.getSession().getDocument();

  this.anchors = {
    start: doc.createAnchor(options.start.row, options.start.column),
    end: doc.createAnchor(options.end.row, options.end.column),
  };
}

/**
 * Gets the range object that represents the current state of the changeArea.
 *
 * The range is modified dinamically, as the document related to the 
 * changeArea changes.
 * 
 * @return {AceRange}
 */
ChangeArea.prototype.getRange = function () {
  var startPos = this.anchors.start.getPosition();
  var endPos   = this.anchors.end.getPosition();

  return new this.Range(
    startPos.row,
    startPos.column,
    endPos.row,
    endPos.column
  );
};

/**
 * Checks whether the change area contains a given aceChange
 *
 * An ace change has two positions: start and end
 * 
 * @param  {AceChange} aceChange
 *         - start: { row: Number, column: Number }
 *         - end: { row: Number, column: Number }
 * @return {Boolean}
 */
ChangeArea.prototype.containsChange = function (aceChange) {

  var changeRange = new this.Range(
    aceChange.start.row,
    aceChange.start.column,
    aceChange.end.row,
    aceChange.end.column
  );

  return this.getRange().containsRange(changeRange);
};

/**
 * Checks whether the change area contains a given position
 * @param  {Object} position
 *         - row: Number
 *         - column: Number
 * @return {Boolean}
 */
ChangeArea.prototype.containsPosition = function (position) {
  return this.getRange().contains(position.row, position.column);
};

module.exports = ChangeArea;
