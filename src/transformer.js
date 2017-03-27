function push(result, key, value) {
    if(result[key]) {
        result[key].push(value);
    } else {
        result[key] = [value];
    }
}

function param(result, {type}) {
    //console.log('param', arguments[1]);
    return result;
}

function prop(result, decl) {
    switch(decl.type) {
        case 'Property': {
            const {name, proptype, title, description, deflt} = decl;
            const prop = {
                type: proptype,
                name
            };

            if(title) {
                prop.title = title.value;
            }
            if(description) {
                prop.description = description.value;
            }
            if(deflt) {
                prop.deflt = deflt.value;
            }
            if(proptype === 'choices') {
                prop.choices = decl.choices.reduce((result, choice) => {
                    result[choice.key.value] = choice.value.value;
                    return result;
                }, {});
            }

            push(result, 'properties', prop);
            break;
        }

        case 'Connection': {
            const {name, description, args, direction} = decl;
            const conn = {
                name,
                description: description && description.value,
                type: args
            };

            switch(direction) {
                case 'input':
                    push(result, 'inputs', conn);
                    break;

                case 'output':
                    push(result, 'outputs', conn);
                    break;

                default:
                    throw new TypeError(`Unknown connection direction ${direction}`);
            }

            break;
        }

        case 'SpawnFlags':
            result.flags = decl.flags.map(({title, value, enabled}) => ({
                title: title.value,
                value: value.value,
                enabled: !!enabled.value
            }));
            break;

        default:
            throw new TypeError(`Unknown property type ${decl.type}`);
    }

    return result;
}

function decl(result, {type, name, class: cls, description, parameters, body}) {
    if(type === 'Include') {
        console.info(`You may also want to include ${name}`);
    }

    if(type === 'Declaration') {
        const decl = {
            type: cls
        };

        if(description) {
            decl.description = description.value;
        }

        result[name] = body.reduce(prop, parameters.reduce(param, decl));
    }

    return result;
}

module.exports = function(ast) {
    return ast.body.reduce(decl, {});
}
