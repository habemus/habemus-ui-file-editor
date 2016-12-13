// own
const aux = require('../../../auxiliary');

const PARSERS = {
  /**
   * For attribute value tokens, the context is the 
   * attribute name to which the value refers to
   */
  'string.attribute-value.xml': function (fileEditor, options, tokenIterator) {
    
    var attributeValue = tokenIterator.getCurrentToken().value;
    
    var attributeNameToken = aux.getPreviousTokenOfType(
      tokenIterator,
      'entity.other.attribute-name.xml',
      [
        'keyword.operator.attribute-equals.xml',
        'text.tag-whitespace.xml',
      ]
    );
    
    var attributeName = attributeNameToken ? attributeNameToken.value : undefined;
    
    return {
      attributeName: attributeName,
      attributeValue: attributeValue.replace(/("|')/g, ''),
    };
    
  },
  
  /**
   * For attribute name tokens, the context has the attributeValue
   */
  'entity.other.attribute-name.xml': function (fileEditor, options, tokenIterator) {
    
    var attributeName = tokenIterator.getCurrentToken().value;
    
    var attributeValueToken = aux.getNextTokenOfType(
      tokenIterator,
      'string.attribute-value.xml',
      [
        'keyword.operator.attribute-equals.xml',
        'text.tag-whitespace.xml',
      ]
    );
    
    var attributeValue = attributeValueToken ?
      attributeValueToken.value.replace(/("|')/g, '') : undefined;
    
    return {
      attributeName: attributeName,
      attributeValue: attributeValue,
    };
  }
};


function htmlContext(fileEditor, options, row, column) {
  // https://ace.c9.io/#nav=api&api=token_iterator
  const TokenIterator = fileEditor.ace.require('ace/token_iterator').TokenIterator;
  
  var tokenIterator = new TokenIterator(
    fileEditor.aceEditor.getSession(),
    row,
    column
  );
  
  var targetToken = tokenIterator.getCurrentToken();
  
  if (!targetToken) {
    return {};
  }
  
  var parserFn = PARSERS[targetToken.type];
  
  var context = (typeof parserFn === 'function') ?
    parserFn(fileEditor, options, tokenIterator) : {};
    
  context.targetToken = targetToken;
  
  return context;
}

module.exports = htmlContext;