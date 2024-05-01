/**
 * Generate code for a JavaScript expression that evaluates to the provided input value.
 * @param {unknown} input The value to represent.
 * @returns string
 */
export function repr(input) {
  function sortKeys(a, b) {
    return a.localeCompare(b);
  }

  let knownObjectOccurrences = new Map();

  let walk = (obj) => {
    if ((typeof obj === 'object') && (obj !== null)) {
      let presentTwice = knownObjectOccurrences.has(obj);
      knownObjectOccurrences.set(obj, presentTwice);

      if (presentTwice) {
        return;
      }

      if (Array.isArray(obj)) {
        for (let item of obj) {
          walk(item);
        }
      } else if (obj.constructor === Set) {
        for (let item of obj) {
          walk(item);
        }
      } else if (obj.constructor === ArrayBuffer) {
        // ...
      } else if (ArrayBuffer.isView(obj)) {
        // ...
      } else if (obj.constructor === Date) {
        // ...
      } else if (obj.constructor === RegExp) {
        // ...
      } else if (obj.constructor === URL) {
        // ...
      } else {
        for (let key of [...Object.getOwnPropertyNames(obj).sort(sortKeys), ...Object.getOwnPropertySymbols(obj)]) {
          walk(key);
          walk(obj[key]);
        }
      }
    } else if (typeof obj === 'symbol') {
      let presentTwice = knownObjectOccurrences.has(obj);
      knownObjectOccurrences.set(obj, presentTwice);
    }
  };

  walk(input);

  let rootName = 'a';
  let circularAssignments = [];
  let knownObjectNames = new Map();
  let nameIndex = 0;

  let missingValueSentinel = Symbol();

  let format = (obj) => {
    if (knownObjectNames.has(obj)) {
      let name = knownObjectNames.get(obj);

      return name !== null
        ? name
        : missingValueSentinel;
    }

    let value;

    if ((typeof obj === 'object') && (obj !== null)) {
      if (knownObjectOccurrences.get(obj)) {
        knownObjectNames.set(obj, null);
      }

      if (Array.isArray(obj)) {
        value = '[' + obj.map((item, index) => {
          let formattedItem = format(item);

          if (formattedItem === missingValueSentinel) {
            knownObjectOccurrences.set(obj, true);
            circularAssignments.push({
              mode: 'array',
              index,
              target: obj,
              value: item
            });

            return JSON.stringify(0);
          } else {
            return formattedItem;
          }
        }).join(', ') + ']';
      } else if (ArrayBuffer.isView(obj)) {
        value = `new ${obj.constructor.name}(Uint8Array.from(atob('${Buffer.from(obj.buffer).toString('base64')}'), (c) => c.charCodeAt(0)).buffer)`;
      } else {
        switch (obj.constructor) {
          case Set:
            value = `new Set([${Array.from(obj).flatMap((item) => {
              let formattedItem = format(item, { mode: 'set', target: obj });

              if (formattedItem === missingValueSentinel) {
                knownObjectOccurrences.set(obj, true);
                circularAssignments.push({
                  mode: 'set',
                  target: obj,
                  value: item
                });

                return [];
              } else {
                return [formattedItem];
              }
            }).join(', ')}])`;

            break;
          case ArrayBuffer:
            value = `Uint8Array.from(atob('${Buffer.from(obj).toString('base64')}'), (c) => c.charCodeAt(0)).buffer`;
            break;
          case Date:
            value = `new Date(${obj.getTime()})`;
            break;
          case RegExp:
            value = obj.toString();
            break;
          case URL:
            value = `new URL('${obj.href}')`;
            break;
          case Object:
          case null:
            value = '{ ' + [...Object.getOwnPropertyNames(obj).sort(sortKeys), ...Object.getOwnPropertySymbols(obj)].flatMap((key) => {
              let formattedKey = format(key);
              let formattedValue = format(obj[key]);

              if (formattedValue === missingValueSentinel) {
                knownObjectOccurrences.set(obj, true);
                circularAssignments.push({
                  mode: 'object',
                  key: formattedKey,
                  target: obj,
                  value: obj[key]
                });

                return [];
              } else {
                return [`[${formattedKey}]: ${formattedValue}`];
              }
            }).join(', ') + ' }';

            break;
        }
      }
    } else if (typeof obj === 'number') {
      value = obj.toString();
    } else if (typeof obj === 'bigint') {
      value = obj.toString() + 'n';
    } else if (typeof obj === 'symbol') {
      value = (obj.description !== undefined)
        ? `Symbol.for(${JSON.stringify(obj.description)})`
        : 'Symbol()';
    } else {
      value = JSON.stringify(obj);
    }

    if (knownObjectOccurrences.get(obj)) {
      let name = `${rootName}.a${nameIndex++}`;
      knownObjectNames.set(obj, name);
      return `(${name} = ${value})`;
    }

    return value;
  };

  let output = `(() => { let ${rootName} = {}; let b = ${format(input)}; `;

  for (let assignment of circularAssignments) {
    let targetName = knownObjectNames.get(assignment.target);
    let valueName = knownObjectNames.get(assignment.value);

    switch (assignment.mode) {
      case 'array':
        output += `${targetName}[${assignment.index}] = ${valueName}; `;
        break;
      case 'object':
        output += `${targetName}[${assignment.key}] = ${valueName}; `;
        break;
      case 'set':
        output += `${targetName}.add(${valueName}); `;
    }
  }

  output += `return b; })()`;
  return output;
}

export default repr;


let v = new Set();
let s = Symbol('f');
// let w = {
//   a: 'b'
// };
// w[s] = w;

// let w = [3, 4];
// w.push(w);
// w.push(w);

v.add({ v });

// v.add(v);

let r = repr({
  // foo: 'bar',
  // p: [s, s, Symbol()],
  // [s]: 42,
  // ['foo bar']: 53,
  v,
  // w,
});

console.log(r);
console.log(eval(r));
