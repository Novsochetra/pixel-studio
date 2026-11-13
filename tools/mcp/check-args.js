// What a tool is given is checked against its own schema before it runs: a size of 5000 by 0
// made a file the studio could not open, a kind the studio has not made one it did not know,
// and arguments of the wrong sort failed with an exception's own words.
const typeOf = (value) => {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return Number.isInteger(value) ? 'integer' : typeof value;
};

const TYPE_WORDS = {
  string: 'words',
  integer: 'a whole number',
  number: 'a number',
  boolean: 'true or false',
  array: 'a list',
  object: 'an object',
  null: 'null',
};

const fits = (value, type) =>
  [type]
    .flat()
    .some((each) => each === typeOf(value) || (each === 'number' && typeof value === 'number'));

function rangeProblem(name, value, { minimum = -Infinity, maximum = Infinity }) {
  return value < minimum || value > maximum
    ? `${name} should be from ${minimum} to ${maximum}, not ${value}.`
    : null;
}

const sortWords = (type) =>
  [type]
    .flat()
    .map((each) => TYPE_WORDS[each])
    .join(' or ');

// the value is of a sort the spec takes, and one of the values it names
function kindProblem(name, value, spec) {
  if (spec.type && !fits(value, spec.type)) {
    return `${name} should be ${sortWords(spec.type)}.`;
  }

  return spec.enum && !spec.enum.includes(value)
    ? `${name} should be one of ${spec.enum.join(', ')}, not ${value}.`
    : null;
}

function valueProblem(name, value, spec) {
  const kind = kindProblem(name, value, spec);

  if (kind) {
    return kind;
  }

  if (typeof value === 'number') {
    return rangeProblem(name, value, spec);
  }

  if (Array.isArray(value) && spec.items) {
    return (
      value.map((item, i) => valueProblem(`${name}[${i}]`, item, spec.items)).find(Boolean) ?? null
    );
  }

  return typeOf(value) === 'object' && spec.properties ? objectProblem(name, value, spec) : null;
}

function objectProblem(name, value, spec) {
  const missing = (spec.required ?? []).find((key) => value[key] === undefined);
  const unknown =
    spec.additionalProperties === false &&
    Object.keys(value).find((key) => !(key in spec.properties));

  if (missing) {
    return `${name} needs ${missing}.`;
  }

  if (unknown) {
    return `${name} takes no ${unknown}: it takes ${Object.keys(spec.properties).join(', ')}.`;
  }

  return (
    Object.entries(value)
      .map(([key, given]) => spec.properties[key] && valueProblem(key, given, spec.properties[key]))
      .find(Boolean) ?? null
  );
}

// why a tool cannot take these arguments, as a sentence, or null when it can
export function argsProblem(tool, args) {
  return typeOf(args) === 'object'
    ? objectProblem(tool.name, args, tool.inputSchema)
    : `${tool.name} takes its arguments as an object.`;
}
