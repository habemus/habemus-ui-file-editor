module.exports = function (fileEditor, options) {

  var aceEditor = fileEditor.aceEditor;
  var aceSession = aceEditor.getSession();
  var aceSelection = aceSession.getSelection();

  aceEditor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: false,
  });

  // return the teardown function
  return function teardown() {
    
  };
};
