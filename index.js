/**
 * Generates code for a JavaScript expression that evaluates to the provided input value.
 * @param {unknown} input The object to represent.
 * @returns string
 */
export function repr(input) {
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
        for (let [key, value] of Object.entries(obj).sort(([a, _a], [b, _b]) => a.localeCompare(b))) {
          walk(value);
        }
      }
    }
  };

  walk(input);

  let rootName = 'a';
  let circularAssignments = [];
  let knownObjectNames = new Map();
  let index = 0;

  let format = (obj, assignment = null) => {
    if ((typeof obj === 'object') && (obj !== null)) {
      if (knownObjectNames.has(obj)) {
        let name = knownObjectNames.get(obj);

        if (name === null) {
          knownObjectOccurrences.set(assignment.target, true);
          circularAssignments.push({
            assignment,
            value: obj
          });

          return JSON.stringify(null);
        }

        return name;
      }

      if (knownObjectOccurrences.get(obj)) {
        knownObjectNames.set(obj, null);
      }

      let value;

      if (Array.isArray(obj)) {
        value = '[' + obj.map((item, index) => format(item, { mode: 'array', index, target: obj })).join(', ') + ']';
      } else if (obj.constructor === Set) {
        value = `new Set([${Array.from(obj).map((item) => format(item)).join(', ')}])`;
      } else if (obj.constructor === ArrayBuffer) {
        value = `Uint8Array.from(atob('${Buffer.from(obj).toString('base64')}'), (c) => c.charCodeAt(0)).buffer`;
      } else if (ArrayBuffer.isView(obj)) {
        value = `new ${obj.constructor.name}(Uint8Array.from(atob('${Buffer.from(obj.buffer).toString('base64')}'), (c) => c.charCodeAt(0)).buffer)`;
      } else if (obj.constructor === Date) {
        value = `new Date(${obj.getTime()})`;
      } else if (obj.constructor === RegExp) {
        value = obj.toString();
      } else if (obj.constructor === URL) {
        value = `new URL('${obj.href}')`;
      } else {
        value = '{ ' + Object.entries(obj).sort(([a, _a], [b, _b]) => a.localeCompare(b)).map(([key, value]) => `${key}: ${format(value, { mode: 'object', key, target: obj })}`).join(', ') + ' }';
      }

      if (knownObjectOccurrences.get(obj)) {
        let name = `${rootName}.a${index++}`;
        knownObjectNames.set(obj, name);
        return `(${name} = ${value})`;
      }

      return value;
    } else if (typeof obj === 'number') {
      return obj.toString();
    } else if (typeof obj === 'bigint') {
      return obj.toString() + 'n';
    } else {
      return JSON.stringify(obj);
    }
  };

  let output = `(() => { let ${rootName} = {}; let b = ${format(input)}; `;

  for (let { assignment, value } of circularAssignments) {
    let targetName = knownObjectNames.get(assignment.target);
    let valueName = knownObjectNames.get(value);

    switch (assignment.mode) {
      case 'array':
        output += `${targetName}[${assignment.index}] = ${valueName}; `;
        break;
      case 'object':
        output += `${targetName}.${assignment.key} = ${valueName}; `;
        break;
    }
  }

  output += `return b; })()`;
  return output;
}

export default repr;
