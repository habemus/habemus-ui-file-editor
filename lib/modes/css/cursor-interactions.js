// third-party
const css = require('css');

// own dependencies
const aux = require('../../auxiliary');

// constants
const MOUSE_POSITION_CHANGE = 'mouse-position-change';
const CURSOR_POSITION_CHANGE = 'cursor-position-change';

const MIME_TYPE = 'text/css';

/**
 * Picks some data from astNode
 * @param  {Object} cssAstNode
 * @return {Object}
 */
function _pickCssAstData(cssAstNode) {

  var data = {
    type: cssAstNode.type,

    // normalize position data
    position: {
      start: {
        row: cssAstNode.position.start.line - 1,
        column: cssAstNode.position.start.column - 1,
      },
      end: {
        row: cssAstNode.position.end.line - 1,
        column: cssAstNode.position.end.column - 1
      },
    }
  };

  switch (cssAstNode.type) {
    case 'rule':
      data.selectors = cssAstNode.selectors;
      break;
  }

  return data;
}

/**
 * Finds the astNode for the given cursorPosition
 * @param  {Array|CSSAstNode} astNodes
 * @param  {Object} cursorPos
 *         - row: Number
 *         - column: Number
 * @return {Object}
 */
function _findAstNodeForCursorPosition(astNodes, cursorPos) {

  // css rule positions start at 1 (row and column)
  var cursorRow = cursorPos.row + 1;
  var cursorColumn = cursorPos.column + 1;

  return astNodes.find(function (astNode) {
    var startsBefore = false;
    var endsAfter    = false;

    // compute startsBefore
    if (astNode.position.start.line < cursorRow) {
      startsBefore = true;
    } else {
      if (astNode.position.start.line === cursorRow) {
        startsBefore = astNode.position.start.column <= cursorColumn;
      } else {
        startsBefore = false;
      }
    }

    // compute endsAfter
    if (astNode.position.end.line > cursorRow) {
      endsAfter = true;
    } else {
      if (astNode.position.end.line === cursorRow) {
        endsAfter = astNode.position.end.column >= cursorColumn;
      } else {
        endsAfter = false;
      }
    }

    return startsBefore && endsAfter;
  });
}

module.exports = function (fileEditor, options) {

  var aceEditor = fileEditor.aceEditor;
  var aceSession = aceEditor.getSession();
  var aceSelection = aceSession.getSelection();
  
  // fn that captures the css context given a position
  const cssContext = require('./context').bind(null, fileEditor, options);

  /**
   * Object with the parsed AST tree
   * @type {CSSAST}
   */
  var PARSED = css.parse(
    aceEditor.getSession().getDocument().getValue(),
    { silent: true }
  );

  /**
   * Executed when the editor changes
   */
  function onEditorChange(e) {
    var value = aceEditor.getSession().getDocument().getValue();

    PARSED = css.parse(value, { silent: true });
  }

  /**
   * Executed when cursor moves
   */
  function onSelectionChangeCursor(e) {

    // find node that cursor points to
    var cursorPos = aceEditor.getCursorPosition();
    var astNodes  = PARSED && PARSED.stylesheet && PARSED.stylesheet.rules || [];
    
    var cursorAstNode = _findAstNodeForCursorPosition(astNodes, cursorPos);

    fileEditor.hDev.publish(CURSOR_POSITION_CHANGE, {
      context: cssContext(cursorPos.row, cursorPos.column),
      f: fileEditor.filepath,
      mode: MIME_TYPE,
      p: cursorPos,
      astNode: cursorAstNode ? _pickCssAstData(cursorAstNode) : {},
    });
  }

  /**
   * Executed when mouse moves in the editor container element
   */
  var lastPublishedPosition;
  function onContainerMousemove(e) {
    
    return;
    
    // get document position from screen position
    var mousePos = aux.aceGetDocPosFromPixelPos(fileEditor.aceEditor, {
      left: e.clientX,
      top: e.clientY
    });

    if (lastPublishedPosition &&
      mousePos.row === lastPublishedPosition.row &&
      mousePos.column === lastPublishedPosition.column) {
      // do nothing
      return;
    }

    var astNodes = PARSED && PARSED.stylesheet && PARSED.stylesheet.rules || [];

    // get cursor charcount
    var charcount = aceSession.getDocument().positionToIndex(mousePos);

    // find corresponding node
    var mouseAstNode = _findAstNodeForCursorPosition(astNodes, mousePos);

    // publish
    fileEditor.hDev.publish(MOUSE_POSITION_CHANGE, {
      f: fileEditor.filepath,
      mode: MIME_TYPE,
      p: mousePos,
      c: charcount,
      astNode: mouseAstNode ? _pickCssAstData(mouseAstNode) : {}
    });

    // save last published position
    lastPublishedPosition = mousePos;
  }

  /**
   * Executed when mouse leaves the editor container element
   */
  function onContainerMouseleave(e) {
    // publish
    fileEditor.hDev.publish('mouse-position-change', {
      f: fileEditor.filepath,
      p: {},
      c: null,
      astNode: false
    });
  }

  aceEditor.on('change', onEditorChange);
  aceSelection.on('changeCursor', onSelectionChangeCursor);
  aceEditor.container.addEventListener('mousemove', onContainerMousemove);
  aceEditor.container.addEventListener('mouseleave', onContainerMouseleave);

  // return the teardown function
  return function teardown() {
    aceEditor.off('change', onEditorChange);
    aceSelection.off('changeCursor', onSelectionChangeCursor);


    aceEditor.container.removeEventListener('mousemove', onContainerMousemove);
    aceEditor.container.removeEventListener('mouseleave', onContainerMouseleave);
  };
};