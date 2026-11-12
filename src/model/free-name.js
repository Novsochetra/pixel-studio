// A name nothing in `taken` has: the name itself, or the first of "Name 2", "Name 3"… that is
// free. Two projects or two versions of one name could not be told apart in their list.
export function freeName(name, taken) {
  let number = 1;
  const numbered = () => (number > 1 ? `${name} ${number}` : name);

  while (taken.includes(numbered())) {
    number += 1;
  }

  return numbered();
}
