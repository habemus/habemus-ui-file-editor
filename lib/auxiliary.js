/**
 * Map of ace modes by mimeType
 * mimeType: aceMode
 * @type {Object}
 */
const ACE_MODES = {
  'application/javascript': 'javascript',
  'application/json': 'json',
  'text/css': 'css',
  'text/html': 'html',
  'text': 'markdown',
};

exports.aceGetModeFromMime = function (mimeType) {
  var aceMode = ACE_MODES[mimeType];

  if (!aceMode) {
    console.warn('could not find correct aceMode for ' + mimeType);
    console.warn('setting it to `text` as a fallback');
    aceMode = 'text';
  }

  return 'ace/mode/' + aceMode;
};

exports.aceGetDocPosFromPixelPos = function (editor, pixelPosition) {

  var pLeft = pixelPosition.left;
  var pTop  = pixelPosition.top;

  var renderer = editor.renderer;

  var canvasPos = renderer.scroller.getBoundingClientRect();
  var offset = (pLeft + renderer.scrollLeft - canvasPos.left - renderer.$padding) / renderer.characterWidth;
  var row = Math.floor((pTop + renderer.scrollTop - canvasPos.top)) / renderer.lineHeight;
  var col = Math.round(offset);

  // var r = this.editor.renderer;
  // if (this.lastT - (r.timeStamp || 0) > 1000) {
  //     r.rect = null;
  //     r.timeStamp = this.lastT;
  //     this.maxHeight = window.innerHeight;
  //     this.maxWidth = window.innerWidth;
  // }

  var screenPos = {row: row, column: col, side: offset - col > 0 ? 1 : -1};
  var session = editor.session;
  var docPos = session.screenToDocumentPosition(screenPos.row, screenPos.column);

  return docPos;

  // var token = session.getTokenAt(docPos.row, docPos.column);

  // if (!token && !session.getLine(docPos.row)) {
  //     token = {
  //         type: "",
  //         value: "",
  //         state: session.bgTokenizer.getState(0)
  //     };
  // }
  // if (!token) {
  //     session.removeMarker(this.marker);
  //     this.hide();
  //     return;
  // }

}

// https://ace.c9.io/#nav=api&api=token_iterator
const TokenIterator = window.ace.require('ace/token_iterator').TokenIterator;

exports.getClosestTokenOfType = function (
  direction,
  tokenIterator,
  targetTokenType,
  validIntermediate
) {
  
  var intermediateTokensValid = true;
  var currentToken = tokenIterator.getCurrentToken();
  var resultToken;
  
  validIntermediate = validIntermediate || false;
  
  if (validIntermediate && validIntermediate.length > 0) {
    
    while (!resultToken && currentToken && intermediateTokensValid) {
      currentToken = tokenIterator[direction]();
      
      if (currentToken.type === targetTokenType) {
        resultToken = currentToken;
      } else {
        
        // check if the intermediate token is valid
        intermediateTokensValid = (validIntermediate.indexOf(currentToken.type) !== -1);
      }
    }
    
  } else {
    
    while (!resultToken && currentToken) {
      currentToken = tokenIterator[direction]();
      
      if (currentToken.type === targetTokenType) {
        resultToken = currentToken;
      }
    }
    
  }
  
  return resultToken;
}

exports.getPreviousTokenOfType = exports.getClosestTokenOfType.bind(null, 'stepBackward');
exports.getNextTokenOfType     = exports.getClosestTokenOfType.bind(null, 'stepForward');

