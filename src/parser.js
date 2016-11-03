class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
        this.token = tokens[this.current];
    }

    next(type = null, value = null, strict = true) {
        this.token = this.tokens[++this.current];
        if((type !== null && this.token.type !== type) || (value !== null && this.token.value !== value)) {
            if(strict) {
                throw new TypeError(`Unexpected token: found ${this.token.type}(${this.token.value}), expected ${type}(${value})`);
            } else {
                return false;
            }
        }

        return true;
    }

    decl() {
        const node = {
            type: 'Declaration',
            class: this.token.value,
            parameters: [],
            body: []
        };

        this.next();
        while (this.token.type !== 'symbol' || this.token.value !== '=') {
            const param = this.param();
            node.parameters.push(param);
        }

        this.next('name');
        node.name = this.token.value;

        if(this.next('symbol', ':', false)) {
            this.next('string');
            node.description = this.literal();
        }

        if(this.token.type !== 'square' && this.token.value === '[') {
            throw new TypeError(`Unexpected token: ${this.token.value}`);
        }

        this.next();
        while (
            (this.token.type !== 'square') ||
            (this.token.type === 'square' && this.token.value !== ']')
        ) {
            node.body.push(this.body());
        }

        this.next();
        return node;
    }

    body() {
        if(this.token.type !== 'name') {
            throw new TypeError(`Unexpected token type: ${this.token.type}`);
        }

        if(this.token.value === 'input' || this.token.value === 'output') {
            return this.connection();
        }

        if(this.token.value === 'spawnflags') {
            return this.spawnflags();
        }

        return this.property();
    }

    include() {
        this.next('string');

        const node = {
            type: 'Include',
            name: this.token.value
        };

        this.next();
        return node;
    }

    connection() {
        const node = {
            type: 'Connection',
            direction: this.token.value
        };

        this.next('name');
        node.name = this.token.value;

        this.next('paren', '(');
        this.next('name');
        node.args = this.token.value;
        this.next('paren', ')');

        this.next('symbol', ':');
        this.next('string');
        node.description = this.literal();
        return node;
    }

    spawnflags() {
        const node = {
            type: 'SpawnFlags',
            flags: []
        };

        this.next('paren', '(');
        this.next('name');
        this.next('paren', ')');
        this.next('symbol', '=');
        this.next('square', '[');

        this.next();
        while(
            this.token.type !== 'square' ||
            (this.token.type === 'square' && this.token.value !== ']')
        ) {
            const prop = {
                type: 'Flag',
                value: this.literal()
            };

            if(this.token.type !== 'symbol' || this.token.value !== ':') {
                throw new TypeError(`Unexpected token: ${this.token.type} ${this.token.value}`);
            }

            this.next();
            prop.title = this.literal();

            if(this.token.type !== 'symbol' || this.token.value !== ':') {
                throw new TypeError(`Unexpected token: ${this.token.type} ${this.token.value}`);
            }

            this.next();
            prop.enabled = this.literal();
            node.flags.push(prop);
        }

        this.next();
        return node;
    }

    property() {
        if(this.token.type !== 'name') {
            throw new TypeError(`Unexpected token type: ${this.token.type}`);
        }

        const node = {
            type: 'Property',
            name: this.token.value
        };

        this.next('paren', '(');
        this.next('name');
        node.proptype = this.token.value;
        this.next('paren', ')');

        if(this.next('symbol', ':', false) && this.next('string', null, false)) {
            node.title = this.literal();
        }

        if(this.token.type === 'symbol' && this.token.value === ':' && !this.next('symbol', ':', false)) {
            node.deflt = this.literal();
        }

        if(this.token.type === 'symbol' && this.token.value === ':' && this.next('string', null, false)) {
            node.description = this.literal();
        }

        if(node.proptype === 'choices' && this.token.type === 'symbol' && this.token.value === '=') {
            this.next('square', '[');

            node.choices = [];

            this.next();
            while(
                this.token.type !== 'square' ||
                (this.token.type === 'square' && this.token.value !== ']')
            ) {
                const prop = {
                    type: 'Option',
                    key: this.literal()
                };

                if(this.token.type !== 'symbol' || this.token.value !== ':') {
                    throw new TypeError(`Unexpected token: ${this.token.type} ${this.token.value}`);
                }

                this.next();
                prop.value = this.literal();
                node.choices.push(prop);
            }

            this.next();
        }
        return node;
    }

    param() {
        if(this.token.type !== 'name') {
            throw new TypeError(`Unexpected token type: ${this.token.type}`);
        }

        const node = {
            type: 'Parameter',
            name: this.token.value,
            properties: []
        };

        this.next('paren', '(');
        this.next();
        while (this.token.type !== 'paren' || this.token.value !== ')') {
            switch(this.token.type) {
                case 'name':
                    node.properties.push(this.name());
                    break;

                case 'string':
                case 'number':
                    node.properties.push(this.literal());
                    break;

                default:
                    throw new TypeError(`Unexpected token type: ${this.token.type}(${this.token.value})`);
            }

            if(this.token.type === 'symbol' && this.token.value === ',') {
                this.next();
            }
        }

        this.next();
        return node;
    }

    name() {
        const node = {
            type: 'Name',
            value: this.token.value
        };

        this.next();
        return node;
    }

    literal() {
        const node = {
            type: 'Literal',
            value: this.token.value
        };

        this.next();
        while(this.token.type === 'symbol' && this.token.value === '+') {
            this.next();
            node.value += this.token.value;
            this.next();
        }
        return node;
    }

    file() {
        if(this.token.type !== 'symbol' || this.token.value !== '@') {
            throw new TypeError(`Unexpected token type: ${this.token.type}`);
        }

        this.next('name');
        if(this.token.value === 'include') {
            return this.include();
        }

        return this.decl();
    }

    parse() {
        var ast = {
            type: 'File',
            body: []
        };

        while (this.current < this.tokens.length) {
            ast.body.push(this.file());
        }

        return ast;
    }
}

module.exports = function(tokens) {
    return new Parser(tokens).parse();
}
