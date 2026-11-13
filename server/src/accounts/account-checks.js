// what is checked of an email and a password before an account is made with them
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_LENGTH = { min: 8, max: 200 };

export const emailOf = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

export function accountProblem({ email, password }) {
  if (!EMAIL.test(email) || email.length > 254) {
    return 'That is not an email address.';
  }

  const length = String(password ?? '').length;

  return length < PASSWORD_LENGTH.min || length > PASSWORD_LENGTH.max
    ? `A password is ${PASSWORD_LENGTH.min} to ${PASSWORD_LENGTH.max} characters long.`
    : null;
}
