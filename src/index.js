const tokenizer = require('./tokenizer');
const parser = require('./parser');
const transformer = require('./transformer');

module.exports = function(input) {
    const tokens = tokenizer(input);
    const ast = parser(tokens);
    return transformer(ast);
};
