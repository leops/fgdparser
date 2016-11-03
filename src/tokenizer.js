const RETURN = /\n/;
const WHITESPACE = /\s/;
const NAME = /[a-z_]/i;
const NUMBER = /[\-\d\.]/;
const SYMBOL = /[@,:=+]/;

module.exports = function(input) {
    const tokens = [];
    let current = 0;

    while (current < input.length) {
        let char = input[current];

        switch(true) {
            case SYMBOL.test(char):
                tokens.push({
                    type: 'symbol',
                    value: char
                });

                current++;
                continue;

            case (char === '(' || char === ')'):
                tokens.push({
                    type: 'paren',
                    value: char
                });

                current++;
                continue;

            case (char === '[' || char === ']'):
                tokens.push({
                    type: 'square',
                    value: char
                });

                current++;
                continue;

            case (char === '{' || char === '}'):
                tokens.push({
                    type: 'bracket',
                    value: char
                });

                current++;
                continue;

            case (char === '"'): {
                let value = '';
                char = input[++current];

                while (char !== '"') {
                    value += char;
                    char = input[++current];
                }

                tokens.push({
                    type: 'string',
                    value
                });

                current++;
                continue;
            }

            case NAME.test(char): {
                let value = '';

                while (NAME.test(char) || NUMBER.test(char)) {
                    value += char;
                    char = input[++current];
                }

                tokens.push({
                    type: 'name',
                    value
                });

                continue;
            }

            case NUMBER.test(char): {
                let value = '';

                while (NUMBER.test(char)) {
                    value += char;
                    char = input[++current];
                }

                tokens.push({
                    type: 'number',
                    value: Number(value)
                });

                continue;
            }

            case WHITESPACE.test(char):
                current++;
                continue;

            case (char === '/'): {
                char = input[++current];
                if(char !== '/') {
                    throw new TypeError(`Unexpected character: ${char} at position ${current}`);
                }

                char = input[++current];
                while (!RETURN.test(char)) {
                    char = input[++current];
                }
                while (RETURN.test(char)) {
                    char = input[++current];
                }

                continue;
            }

            default:
                throw new TypeError(`Unknown character: ${char} at position ${current}`);
        }
    }

    return tokens;
}
