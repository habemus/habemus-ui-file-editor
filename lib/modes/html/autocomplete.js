// own
const aux = require('../../auxiliary');

const MDN_HTML_REFERENCE = require('../../data/mdn-html-reference.json');
const HEADING_ELEMENTS   = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

const AUTOCOMPLETE_INTENTION = 'autocomplete-intention';
const AUTOCOMPLETE_DETACH    = 'autocomplete-detach';
const MIME_TYPE = 'text/html';

module.exports = function (fileEditor, options) {

  var aceEditor = fileEditor.aceEditor;

  // requires:
  // ace-builds/src-noconflict/ext-language_tools.js
  var languageTools = fileEditor.ace.require('ace/ext/language_tools');

  //////////
  // EMMET
  // taken from ace kitchen-sink
  var Emmet = fileEditor.ace.require('ace/ext/emmet');

  // ace-emmet-core (made by ace-editor guys, based on emmet for sublime-text)
  // uses literal octals, which are not strict-mode compliant
  // and that breaks vulcanize.
  // 
  // For now we've replaced all octal literals in the ace-emmet-core lib
  // and removed parts that had string octal escapes.
  // 
  // We should exclude the script if any problem happens.
  // 
  // TODO: implement emmet support
  Emmet.setCore(window.emmet);

  // create a completer without the useless tooltip
  var snippetCompleterWithoutUselessDocs = {
    getCompletions: languageTools.snippetCompleter.getCompletions.bind(languageTools.snippetCompleter),
  };

  // EMMET
  ///////////

  var htmlCompleterWithDocs = {
    getCompletions: languageTools.keyWordCompleter.getCompletions.bind(languageTools.keyWordCompleter),
    getDocTooltip: function (item) {
      
      var mode = aceEditor.getSession().getMode();

      // TODO: add check for mode
      if (item.meta === 'tag') {

        var tagName = item.tagName;

        // MDN has grouped h1-h6 in 'Heading_Elements'
        if (HEADING_ELEMENTS.indexOf(tagName) !== -1) {
          tagName = 'Heading_Elements'
        }

        var refItem = MDN_HTML_REFERENCE.find(function (ref) {
          return ref.name === tagName;
        });

        if (refItem) {

          var codeExamples = refItem.examples.map(function (ex) {
            return '<code>' + ex + '</code>';
          });

          item.docHTML = [
            '<b>', refItem.name, '</b>',
            '<hr></hr>',
            '<p style="white-space: normal; max-width: 300px;">', refItem.summary, '</p>',
            '<hr></hr>',
            '<div style="font-size: 10px">', codeExamples, '</div>',
            '<caption>fonte: Mozilla Developer Network</caption>',
          ].join('');
        }
      }
    }
  }

  languageTools.setCompleters([
    snippetCompleterWithoutUselessDocs,
    htmlCompleterWithDocs,
  ]);

  aceEditor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: false,
  });

  /**
   * Executed when the autocomplete is hovered by the cursor
   */
  function onEditorAutocompleteHover(hoveredItem) {
    
  }

  /**
   * Executed when the autocomplete is selected
   * @param  {Object} selectedItem
   *         - name: String
   *         - example: String
   */
  function onEditorAutocompleteSelect(selectedItem) {
    var doc = aceEditor.getSession().getDocument();

    var cursorPos = aceEditor.getCursorPosition();

    // try to get a change Anchor set for the position
    var changeArea = fileEditor.changeManager.findChangeAreaForPosition(cursorPos);

    if (changeArea) {
      // if the cursor is within a change area,
      // use the change area first anchor as the position instead
      cursorPos = changeArea.getRange().start;
    }

    var doc = fileEditor.aceEditor.getSession().getDocument();

    var unsavedChars = fileEditor.changeManager.computeUnsavedCharCount(cursorPos);
    var cursorIndex  = doc.positionToIndex(cursorPos) - unsavedChars;

    fileEditor.hfs.publish(AUTOCOMPLETE_INTENTION, {
      f: fileEditor.filepath,
      mode: MIME_TYPE,
      p: position,
      c: cursorIndex,      
      insert: {
        name: selectedItem.name,
        html: selectedItem.example
      }
    });
  }

  /**
   * Executed when autocomplete closes
   */
  function onEditorAutocompleteDetach() {
    fileEditor.hfs.publish(AUTOCOMPLETE_DETACH, {
      filepath: fileEditor.filepath,
      mode: MIME_TYPE,
    });
  }

  aceEditor.on('autocomplete-hover', onEditorAutocompleteHover);
  aceEditor.on('autocomplete-select', onEditorAutocompleteSelect);
  aceEditor.on('autocomplete-detach', onEditorAutocompleteDetach);

  return function teardown() {
    aceEditor.off('autocomplete-hover', onEditorAutocompleteHover);
    aceEditor.off('autocomplete-select', onEditorAutocompleteSelect);
    aceEditor.off('autocomplete-detach', onEditorAutocompleteDetach);
  };
}