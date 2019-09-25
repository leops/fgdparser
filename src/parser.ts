import { Token } from './tokenizer';

type TokenType = Token['type'];

export interface File {
    type: 'File';
    body: BodyNode[];
}

export type BodyNode =
    | Declaration
    | Include
    | Mapsize
    | MaterialExclusion
    | AutoVisGroup;

interface Declaration {
    type: 'Declaration';
    class: string;
    name: string;
    description?: Literal;
    parameters: Parameter[];
    body: DeclNode[];
}

export type DeclNode = Connection | SpawnFlags | Property;

export interface Parameter {
    type: 'Parameter';
    name: string;
    properties: (Name | Literal)[];
}

interface Name {
    type: 'Name';
    value: string;
}

interface Literal {
    type: 'Literal';
    value: string;
}

interface Connection {
    type: 'Connection';
    direction: string;
    name: string;
    args: string;
    description?: Literal;
}

interface SpawnFlags {
    type: 'SpawnFlags';
    flags: Flag[];
}

interface Property {
    type: 'Property';
    name: string;
    proptype: string;
    title: Literal;
    deflt: Literal;
    description: Literal;
    choices: Option[];
}

interface Include {
    type: 'Include';
    name: string;
}

interface Mapsize {
    type: 'Mapsize';
    x: number;
    y: number;
}

interface MaterialExclusion {
    type: 'MaterialExclusion';
    materials: string[];
}

interface AutoVisGroup {
    type: 'AutoVisGroup';
    description: string;
    categories: Category[];
}

interface Category {
    type: 'Category';
    name: string;
    groups: VisGroup[];
}

interface VisGroup {
    type: 'VisGroup';
    name: string;
}

interface Flag {
    type: 'Flag';
    value: Literal;
    title: Literal;
    enabled: Literal;
}

interface Option {
    type: 'Option';
    key: Literal;
    value: Literal;
}

const EMPTY_LIT: Literal = Object.freeze({
    type: 'Literal',
    value: '',
});

class Parser {
    private current = 0;
    private token: Token;

    constructor(private tokens: Token[]) {
        this.token = tokens[this.current];
    }

    next(
        type: TokenType | null = null,
        value: string | number | null = null,
        strict = true,
    ) {
        this.token = this.tokens[++this.current];
        if (
            (type !== null && this.token.type !== type) ||
            (value !== null && this.token.value !== value)
        ) {
            if (strict) {
                throw new TypeError(
                    `Unexpected token: found ${this.token.type}(${this.token.value}), expected ${type}(${value})`,
                );
            } else {
                return false;
            }
        }

        return true;
    }

    decl() {
        const node: Declaration = {
            type: 'Declaration',
            class: this.token.value as string,
            name: '',
            parameters: [],
            body: [],
        };

        this.next();
        while (this.token.type !== 'symbol' || this.token.value !== '=') {
            const param = this.param();
            node.parameters.push(param);
        }

        this.next('name');
        node.name = this.token.value;

        if (this.next('symbol', ':', false)) {
            this.next('string');
            node.description = this.literal();
        }

        // @ts-ignore
        if (this.token.type !== 'square' && this.token.value === '[') {
            throw new TypeError(`Unexpected token: ${this.token.value}`);
        }

        this.next();
        while (
            // @ts-ignore
            this.token.type !== 'square' ||
            // @ts-ignore
            (this.token.type === 'square' && this.token.value !== ']')
        ) {
            node.body.push(this.body());
        }

        this.next();
        return node;
    }

    body() {
        if (this.token.type !== 'name') {
            throw new TypeError(
                `Unexpected token type: ${this.token.type} ${this.token.value}`,
            );
        }

        if (this.token.value === 'input' || this.token.value === 'output') {
            return this.connection();
        }

        if (this.token.value.toLowerCase() === 'spawnflags') {
            return this.spawnflags();
        }

        return this.property();
    }

    include() {
        this.next('string');

        const node: Include = {
            type: 'Include',
            name: this.token.value as string,
        };

        this.next();
        return node;
    }

    mapsize() {
        this.next('paren', '(');
        this.next('number');

        const node: Mapsize = {
            type: 'Mapsize',
            x: this.token.value as number,
            y: 0,
        };

        this.next('symbol', ',');
        this.next('number');
        node.y = this.token.value as number;

        this.next('paren', ')');
        this.next();
        return node;
    }

    materialExclusion() {
        this.next('square', '[');

        const node: MaterialExclusion = {
            type: 'MaterialExclusion',
            materials: [],
        };

        while (this.next('string', null, false)) {
            node.materials.push(this.token.value as string);
        }

        if (this.token.type !== 'square' || this.token.value !== ']') {
            throw new TypeError(
                `Unexpected token ${this.token.type} ${this.token.value}`,
            );
        }

        this.next();
        return node;
    }

    autoVisGroup() {
        this.next('symbol', '=');
        this.next('string');

        const node: AutoVisGroup = {
            type: 'AutoVisGroup',
            description: this.token.value as string,
            categories: [],
        };

        this.next('square', '[');
        while (this.next('string', null, false)) {
            const category: Category = {
                type: 'Category',
                name: this.token.value as string,
                groups: [],
            };

            this.next('square', '[');
            while (this.next('string', null, false)) {
                category.groups.push({
                    type: 'VisGroup',
                    name: this.token.value as string,
                });
            }

            if (this.token.type !== 'square' || this.token.value !== ']') {
                throw new TypeError(
                    `Unexpected ${this.token.type} token ${this.token.value}`,
                );
            }

            node.categories.push(category);
        }

        this.next();
        return node;
    }

    connection() {
        const node: Connection = {
            type: 'Connection',
            direction: this.token.value as string,
            name: '',
            args: '',
        };

        this.next('name');
        node.name = this.token.value as string;

        this.next('paren', '(');
        this.next('name');
        node.args = this.token.value as string;
        this.next('paren', ')');

        if (this.next('symbol', ':', false)) {
            this.next('string');
            node.description = this.literal();
        }

        return node;
    }

    spawnflags() {
        const node: SpawnFlags = {
            type: 'SpawnFlags',
            flags: [],
        };

        this.next('paren', '(');
        this.next('name');
        this.next('paren', ')');
        this.next('symbol', '=');
        this.next('square', '[');

        this.next();
        while (
            this.token.type !== 'square' ||
            (this.token.type === 'square' && this.token.value !== ']')
        ) {
            const prop: Flag = {
                type: 'Flag',
                value: this.literal(),
                title: EMPTY_LIT,
                enabled: EMPTY_LIT,
            };

            if (this.token.type !== 'symbol' || this.token.value !== ':') {
                throw new TypeError(
                    `Unexpected token: ${this.token.type} ${this.token.value}`,
                );
            }

            this.next();
            prop.title = this.literal();

            if (this.token.type !== 'symbol' || this.token.value !== ':') {
                throw new TypeError(
                    `Unexpected token: ${this.token.type} ${this.token.value}`,
                );
            }

            this.next();
            prop.enabled = this.literal();
            node.flags.push(prop);
        }

        this.next();
        return node;
    }

    property() {
        if (this.token.type !== 'name') {
            throw new TypeError(`Unexpected token type: ${this.token.type}`);
        }

        const node: Property = {
            type: 'Property',
            name: this.token.value,
            proptype: '',
            title: EMPTY_LIT,
            deflt: EMPTY_LIT,
            description: EMPTY_LIT,
            choices: [],
        };

        this.next('paren', '(');
        this.next('name');
        node.proptype = this.token.value.toLowerCase();
        this.next('paren', ')');

        if (this.next('name', null, false)) {
            if (['report', 'readonly'].indexOf(this.token.value) !== -1) {
                this.next();
            }
        }

        if (
            // @ts-ignore
            this.token.type === 'symbol' &&
            this.token.value === ':' &&
            this.next('string', null, false)
        ) {
            node.title = this.literal();
        }

        if (
            // @ts-ignore
            this.token.type === 'symbol' &&
            this.token.value === ':' &&
            !this.next('symbol', ':', false)
        ) {
            node.deflt = this.literal();
        }

        if (
            // @ts-ignore
            this.token.type === 'symbol' &&
            this.token.value === ':' &&
            this.next('string', null, false)
        ) {
            node.description = this.literal();
        }

        if (
            node.proptype === 'choices' &&
            // @ts-ignore
            this.token.type === 'symbol' &&
            this.token.value === '='
        ) {
            this.next('square', '[');

            node.choices = [];

            this.next();
            while (
                // @ts-ignore
                this.token.type !== 'square' ||
                // @ts-ignore
                (this.token.type === 'square' && this.token.value !== ']')
            ) {
                const prop: Option = {
                    type: 'Option',
                    key: this.literal(),
                    value: EMPTY_LIT,
                };

                // @ts-ignore
                if (this.token.type !== 'symbol' || this.token.value !== ':') {
                    throw new TypeError(
                        `Unexpected token: ${this.token.type} ${this.token.value}`,
                    );
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
        if (this.token.type !== 'name') {
            throw new TypeError(`Unexpected token type: ${this.token.type}`);
        }

        const node: Parameter = {
            type: 'Parameter',
            name: this.token.value,
            properties: [],
        };

        if (this.next('paren', '(', false)) {
            this.next();
            // @ts-ignore
            while (this.token.type !== 'paren' || this.token.value !== ')') {
                switch (this.token.type) {
                    case 'name':
                        node.properties.push(this.name());
                        break;

                    // @ts-ignore
                    case 'string':
                    // @ts-ignore
                    case 'number':
                        node.properties.push(this.literal());
                        break;

                    default:
                        throw new TypeError(
                            `Unexpected token type: ${this.token.type}(${this.token.value})`,
                        );
                }

                // @ts-ignore
                if (this.token.type === 'symbol' && this.token.value === ',') {
                    this.next();
                }
            }
            this.next();
        }

        return node;
    }

    name() {
        const node: Name = {
            type: 'Name',
            value: this.token.value as string,
        };

        this.next();
        return node;
    }

    literal() {
        const node: Literal = {
            type: 'Literal',
            value: this.token.value as string,
        };

        this.next();
        while (this.token.type === 'symbol' && this.token.value === '+') {
            if (this.next('string', null, false)) {
                node.value += this.token.value;
                this.next();
            }
        }

        return node;
    }

    file() {
        if (this.token.type !== 'symbol' || this.token.value !== '@') {
            throw new TypeError(`Unexpected token type: ${this.token.type}`);
        }

        this.next('name');
        // @ts-ignore
        if (this.token.value === 'include') {
            return this.include();
        }

        // @ts-ignore
        if (this.token.value === 'mapsize') {
            return this.mapsize();
        }

        // @ts-ignore
        if (this.token.value === 'MaterialExclusion') {
            return this.materialExclusion();
        }

        // @ts-ignore
        if (this.token.value === 'AutoVisGroup') {
            return this.autoVisGroup();
        }

        return this.decl();
    }

    parse() {
        var ast: File = {
            type: 'File',
            body: [],
        };

        while (this.current < this.tokens.length) {
            ast.body.push(this.file());
        }

        return ast;
    }
}

export default function parser(tokens: Token[]) {
    return new Parser(tokens).parse();
}
