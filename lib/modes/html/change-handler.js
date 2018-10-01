// third-party
const Bluebird   = require('bluebird');
const htmlparser = require('htmlparser2');
const DomUtils   = require('domutils');

function parseHTML(html) {

  return new Bluebird((resolve, reject) => {
    var handler = new htmlparser.DomHandler((err, dom) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(dom);
    }, {
      withStartIndices: true,
      withEndIndices: true,
    });

    var parser = new htmlparser.Parser(handler);
    parser.write(html);
    parser.end();
  });

}




module.exports = function (fileEditor, options) {
  // attach event listeners
  var aceEditor    = fileEditor.aceEditor;
  var aceSession   = fileEditor.aceEditor.getSession();
  var aceSelection = aceSession.getSelection();


  /**
   * Finds element that contains the given charIndex
   * @param  {String} filepath
   * @param  {Number} charIndex
   * @return {DOMElement}
   */
  function findNodeForCharIndex(dom, charIndex) {
    // TODO! OPTIMIZE!!!!!!!
    var candidateNodes = DomUtils.filter(function (node) {
      var cursorIsWithinElement = (charIndex >= node.startIndex && charIndex <= node.endIndex);

      return cursorIsWithinElement;
    }, dom);

    var node = candidateNodes.reduce((currentNode, candidateNode) => {
      if (!currentNode) {
        return candidateNode;
      }

      var candidateIsMoreSpecific = (candidateNode.startIndex > currentNode.startIndex);

      return candidateIsMoreSpecific ? candidateNode : currentNode;
    }, false);

    if (node) {
      return node;
    } else {
      return null;
    }
  }




  aceEditor.on('change', function (change) {
    // console.log('change.start', change.start);
    // console.log('change.end', change.end);

    // // var started = Date.now();

    // setTimeout(function () {

    //   var cursorPos = aceEditor.getCursorPosition();

    //   console.log('cursor', cursorPos)
    // },0 )

    console.log(change);


    var changeCharIndex = aceSession.doc.positionToIndex(change.start);

    // console.log(changeCharIndex);

    parseHTML(aceEditor.getValue()).then((dom) => {
      // var finished = Date.now();

      // console.log('took ' + (finished - started) + 'ms');
      // console.log(dom);


      // var changeNode = findNodeForCharIndex(dom, changeCharIndex);


      // var changeData = {};

      // if (changeNode.type === 'tag') {
      //   changeData.element = changeNode;
      // } else if (changeNode.type === 'text') {
      //   changeData.element = changeNode.parent;
      //   changeData.childNodeIndex = changeNode.parent.children.indexOf(changeNode);
      // }

      // console.log(changeData);


    });
  })
};
