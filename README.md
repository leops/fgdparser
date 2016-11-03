FGDParser
=============

FGD (Forge Game Data) is a configuration format used by the Hammer editor to
define the entities available in the editor and their properties.

## Usage
This module is based on my previous [vmfparser](https://github.com/leops/vmfparser/), and exposes a similar API.
It exports a single `parse(input, options)` function, with the `input` being
an FGD source string, and `options` is an optional object with the following
properties:

- `ast`: If true, will return the Abstract Syntax Tree instead of the
transformed object.
