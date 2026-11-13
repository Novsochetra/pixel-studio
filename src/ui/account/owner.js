import { accountOnServer, signOut } from '../../store/server-account.js';
import { askToSignIn } from './sign-in-screen.js';

// whose work the page opens: the account signed in on the studio's own server (asked for when
// nobody is), or null where the page has no such server
// `asking`: called as the sign-in shows, for what was on the screen to give way
export async function ownerOfWork({ asking }) {
  const account = await accountOnServer();

  if (!account) {
    return null;
  }

  if (account.user) {
    return account.user;
  }

  asking();

  return askToSignIn();
}

// signed out, the page starts again at its sign-in
export async function signOutAndLeave() {
  await signOut().catch(() => null);
  location.reload();
}
