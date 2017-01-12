// own
const aux = require('../../../auxiliary');
// https://ace.c9.io/#nav=api&api=token_iterator
const TokenIterator = window.ace.require('ace/token_iterator').TokenIterator;


function _tokenIs(token, test) {
  
  if (token === null) {
    return test === null;
  }
  
  if (typeof test === 'function') {
    return test(token);
  } else if (typeof test === 'string') {
    return token.type === test;
  } else if (Array.isArray(test)) {
    return test.some(function (t) {
      return _tokenIs(token, t);
    });
  } else if (test instanceof RegExp) {
    return test.test(token.value);
  } else {
    throw new Error('unsupported test ' + test);
  }
  
}

function collectTokensTowards(editSession, pos, options) {
  
  if (!options.direction) {
    throw new Error('options.direction is required');
  }
  
  if (!options.target) {
    throw new Error('options.target is required');
  }
  
  if (!options.intermediary) {
    throw new Error('options.intermediary is required');
  }
  
  var tokenIterator = new TokenIterator(
    editSession,
    pos.row,
    pos.column
  );
  
  var _direction    = options.direction;
  var _target       = options.target;
  var _intermediary = options.intermediary;
  var _nextToken    = _direction === 'fw' ?
    tokenIterator.stepForward.bind(tokenIterator) :
    tokenIterator.stepBackward.bind(tokenIterator);
  
  var intermediaryValid = true;
  var currentToken = true;
  var targetReached;
  
  var collectedTokens = [];
  while (!targetReached && currentToken && intermediaryValid) {
    currentToken = _nextToken();
    
    if (_tokenIs(currentToken, _target)) {
      targetReached = true;
      collectedTokens.push(currentToken);
    } else {
      intermediaryValid = _tokenIs(currentToken, _intermediary);
      if (intermediaryValid) {
        collectedTokens.push(currentToken);
      }
    }
  }
  
  return {
    targetReached: targetReached,
    tokens: _direction === 'fw' ? collectedTokens : collectedTokens.reverse(),
  };
}

function collectTokens(editSession, pos, boundaries) {
  return [
    collectTokensTowards(editSession, pos, {
      direction: 'bw',
      target: boundaries[0].target,
      intermediary: boundaries[0].intermediary,
    }),
    collectTokensTowards(editSession, pos, {
      direction: 'fw',
      target: boundaries[1].target,
      intermediary: boundaries[1].intermediary,
    }),
  ];
}


const VALID_DECLARATION_VALUE_TOKENS = [
  'string',
  'constant.numeric',
  'keyword',
  'support.function',
  'support.constant',
  // 'support.type',
  'support.constant.color',
  'support.constant.fonts',
  // 'text',
  function (token) {
    return token.type === 'text' && !/;/.test(token.value);
  },
];


// context names based on:
// https://developer.mozilla.org/en-US/docs/Web/CSS/Syntax
const CONTEXT_PARSERS = [
  {
    name: 'declaration',
    detail: 'declaration-property',
    preCondition: [
      'support.type'
    ],
    fn: function (fileEditor, pos) {
      var editSession = fileEditor.aceEditor.getSession();
      
      var currentToken = editSession.getTokenAt(pos.row, pos.column);
      
      // var bwTokens = collectTokensTowards(editSession, pos, {
      //   direction: 'bw',
      //   target: 'support.type',
      //   intermediary: VALID_DECLARATION_VALUE_TOKENS
      // });
      
      var fwTokens = collectTokensTowards(editSession, pos, {
        direction: 'fw',
        target: /;$/,
        intermediary: VALID_DECLARATION_VALUE_TOKENS
      });
      
      var context = fwTokens.tokens.reduce(function (res, token) {
          
        if (token) {
          res.source += token.value;
        }
        
        return res;
        
      }, {
        source: currentToken.value,
        currentToken: currentToken,
      });
      
      // trim trailing whitespace
      context.source = context.source.replace(/\s+$/, '');
      
      return context;
    }
  },
  {
    name: 'declaration',
    detail: 'declaration-end',
    preCondition: [
      /;\s*$/,
    ],
    fn: function (fileEditor, pos) {
      var editSession = fileEditor.aceEditor.getSession();
      
      var currentToken = editSession.getTokenAt(pos.row, pos.column);

      var bwTokens = collectTokensTowards(editSession, pos, {
        direction: 'bw',
        target: 'support.type',
        intermediary: VALID_DECLARATION_VALUE_TOKENS
      });
      
      if (!bwTokens.targetReached) {
        return false;
      }
      
      var context = bwTokens.tokens.reduce(function (res, token, index) {
        
        res.source += token.value;
        
        return res;
        
      }, {
        source: '',
        currentToken: currentToken,
      });
      
      context.source = context.source + currentToken.value;
      
      return context;
    }
  },
  {
    name: 'declaration',
    detail: 'declaration-value',
    preCondition: VALID_DECLARATION_VALUE_TOKENS,
    fn: function (fileEditor, pos) {
      
      var editSession = fileEditor.aceEditor.getSession();
      
      var currentToken = editSession.getTokenAt(pos.row, pos.column);
      
      var bwTokens = collectTokensTowards(editSession, pos, {
        direction: 'bw',
        target: 'support.type',
        intermediary: VALID_DECLARATION_VALUE_TOKENS,
      });
      
      if (!bwTokens.targetReached) {
        return false;
      }
      
      var fwTokens = collectTokensTowards(editSession, pos, {
        direction: 'fw',
        target: /;\s*$/,
        intermediary: VALID_DECLARATION_VALUE_TOKENS
      });
      
      var contextTokens = bwTokens.tokens
        .concat([currentToken])
        .concat(fwTokens.tokens);
        
      var context = contextTokens.reduce(function (res, token) {
          
        if (token) {
          res.source += token.value;
        }
        
        return res;
        
      }, {
        source: '',
        currentToken: currentToken,
      });
      
      // trim trailing whitespace
      context.source = context.source.replace(/\s+$/, '');
      
      return context;
    }
  }
];

function cssContext(fileEditor, options, row, column) {
  
  var index = 0;
  var parserCandidate;
  var context;
  
  var currentToken = fileEditor.aceEditor.getSession().getTokenAt(row, column);
  var pos = {
    row: row,
    column: column,
  };
  
  while (!context && index <= CONTEXT_PARSERS.length - 1) {
    
    parserCandidate = CONTEXT_PARSERS[index];
    
    if ((parserCandidate.preCondition &&
        _tokenIs(currentToken, parserCandidate.preCondition)) ||
        !parserCandidate.preCondition) {
      context = parserCandidate.fn(fileEditor, pos);
      
      if (context) {
        context.name = parserCandidate.name;
        context.detail = parserCandidate.detail;
        break;
      }
    }
    
    index += 1;
  }
  
  return context;
}

module.exports = cssContext;
