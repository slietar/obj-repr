# obj-repr

This library generates code for a JavaScript expression that evaluates to the provided input value, similar to the `repr()` function in Python. Compared to JSON and similar serialization solutions, `obj-repr` has support for the following:

- repeated and circular references
- typed arrays
- bigints
- `Map`, `Set`
- `Date`, `RegExp`, `URL`

Under the hood, `obj-repr` returns code that creates an IIFE which resolves all references and recreates complex functions. It is meant to be used with JavaScript code generators, such as bundlers, when passing data from the bundler's options the to the output files.


## Installation

```sh
$ npm install obj-repr
```


## Usage

```js
import repr from 'obj-repr';

let obj = {
  a: 4,
  b: 'hello',
  c: new Set([5, 6])
};

obj.self = obj;

let output = repr(obj);
// => an opaque string of JavaScript

eval(output);
// => <ref *1> {
//   a: 4,
//   b: 'hello',
//   c: Set(2) { 5, 6 },
//   self: [Circular *1]
// }
```
