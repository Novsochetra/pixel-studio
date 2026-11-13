import { node, replace } from '../dom.js';
import { fieldRow, listGroup } from '../list-group.js';
import { enter } from '../../store/server-account.js';

const WAYS = { signin: 'Sign in', signup: 'Create account' };

const field = (attributes) => node('input.list-field', { required: true, ...attributes });

function wayButtons(form) {
  return node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Sign in or create an account' },
    Object.entries(WAYS).map(([way, label]) =>
      node(
        'button',
        {
          type: 'button',
          'aria-pressed': String(form.way === way),
          onclick: () => form.turnTo(way),
        },
        label,
      ),
    ),
  );
}

function fieldsOf(form) {
  const creating = form.way === 'signup';

  return listGroup(
    { note: creating ? 'A password of 8 characters or more.' : null },
    fieldRow('Email', form.email),
    fieldRow('Password', form.password),
  );
}

// the form drawn again for the way picked, keeping what was typed
function drawForm(form) {
  form.password.autocomplete = form.way === 'signup' ? 'new-password' : 'current-password';
  replace(
    form.el,
    wayButtons(form),
    fieldsOf(form),
    form.said,
    node('button.btn.primary', { type: 'submit' }, WAYS[form.way]),
  );
}

async function submitted(form, done) {
  form.said.textContent = '';
  form.el.querySelector('[type=submit]').disabled = true;

  try {
    done(await enter(form.way, { email: form.email.value, password: form.password.value }));
  } catch (error) {
    form.said.textContent = error.message;
    form.el.querySelector('[type=submit]').disabled = false;
  }
}

function newForm() {
  return {
    way: 'signin',
    el: node('form.start-fields.sign-in', {}),
    email: field({
      type: 'email',
      autocomplete: 'email',
      'aria-label': 'Email',
      id: 'sign-in-email',
    }),
    password: field({
      type: 'password',
      'aria-label': 'Password',
      id: 'sign-in-password',
      minLength: 8,
    }),
    said: node('p.start-warning', { role: 'alert' }),
  };
}

const screenOf = (form) =>
  node(
    'div.start-screen',
    { role: 'main' },
    node(
      'div.start-panel',
      {},
      node('h1.wordmark-big', {}, 'PIXEL CLEAN'),
      node('p.hint', {}, 'Your work is kept in your account, on any device.'),
      form.el,
    ),
  );

// On the studio's own server the work is an account's: whoever opens the page signs in, or makes
// an account, before the editor opens. Resolves with the account signed in.
export function askToSignIn() {
  return new Promise((done) => {
    const form = newForm();
    const screen = screenOf(form);

    form.turnTo = (way) => {
      form.way = way;
      form.said.textContent = '';
      drawForm(form);
    };
    form.el.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted(form, (user) => {
        screen.remove();
        done(user);
      });
    });
    drawForm(form);
    document.body.append(screen);
    form.email.focus();
  });
}
