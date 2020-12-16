import { File, BodyNode, Parameter, DeclNode } from './parser';

type ArrayItem<T> = T extends ReadonlyArray<infer R> ? R : never;

function push<T, K extends keyof T>(result: T, key: K, value: ArrayItem<T[K]>) {
    if (result[key]) {
        // @ts-ignore
        result[key].push(value);
    } else {
        // @ts-ignore
        result[key] = [value];
    }
}

interface SpawnFlag {
    title: string;
    value: string;
    enabled: boolean;
}

interface Connection {
    name: string;
    type: string;
    description?: string;
}

interface Parameters {
    [key: string]: string[];
}

interface Declaration {
    type: string;
    description?: string;
    parameters?: Parameters;
    properties?: Property[];
    inputs?: Connection[];
    outputs?: Connection[];
    flags?: SpawnFlag[];
}

function param(result: Declaration, param: Parameter) {
    let parameters = result.parameters;
    if(!parameters) {
        parameters = {};
        result.parameters = parameters;
    }

    parameters[param.name] = param.properties.map(prop => prop.value);
    return result;
}

interface StringMap {
    [key: string]: string;
}

interface Property {
    type: string;
    name: string;
    title?: string;
    description?: string;
    deflt?: string;
    choices?: StringMap;
}

function prop(result: Declaration, decl: DeclNode) {
    switch (decl.type) {
        case 'Property': {
            const { name, proptype, title, description, deflt } = decl;
            const prop: Property = {
                type: proptype,
                name,
            };

            if (title) {
                prop.title = title.value;
            }
            if (description) {
                prop.description = description.value;
            }
            if (deflt) {
                prop.deflt = deflt.value;
            }
            if (proptype === 'choices') {
                prop.choices = decl.choices.reduce(
                    (result: StringMap, choice) => {
                        result[choice.key.value] = choice.value.value;
                        return result;
                    },
                    {},
                );
            }

            push(result, 'properties', prop);
            break;
        }

        case 'Connection': {
            const { name, description, args, direction } = decl;
            const conn: Connection = {
                name,
                description: description && description.value,
                type: args,
            };

            switch (direction) {
                case 'input':
                    push(result, 'inputs', conn);
                    break;

                case 'output':
                    push(result, 'outputs', conn);
                    break;

                default:
                    throw new TypeError(
                        `Unknown connection direction ${direction}`,
                    );
            }

            break;
        }

        case 'SpawnFlags':
            result.flags = decl.flags.map(({ title, value, enabled }) => ({
                title: title.value,
                value: value.value,
                enabled: !!enabled.value,
            }));
            break;
    }

    return result;
}

export interface Declarations {
    [name: string]: Declaration;
}

function decl(result: Declarations, node: BodyNode) {
    if (node.type === 'Include') {
        console.info(`You may also want to include ${node.name}`);
    }

    if (node.type === 'Declaration') {
        const decl: Declaration = {
            type: node.class,
        };

        if (node.description) {
            decl.description = node.description.value;
        }

        result[node.name] = node.body.reduce(
            prop,
            node.parameters.reduce(param, decl),
        );
    }

    return result;
}

export default function transformer(ast: File) {
    return ast.body.reduce(decl, {});
}
