// An error the studio raises itself carries a sentence written for a person to read. A browser's
// own errors carry words for a programmer, so those give way to what was being done.
export function told(message) {
  return Object.assign(new Error(message), { told: true });
}

export const inWords = (error, otherwise) => (error?.told ? error.message : otherwise);
