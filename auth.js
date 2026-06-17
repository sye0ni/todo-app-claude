async function requireAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.href = 'login.html';
    return null;
  }
  return session;
}

async function signOut() {
  await db.auth.signOut();
  location.href = 'login.html';
}

async function signInWithOAuth(provider) {
  const { error } = await db.auth.signInWithOAuth({
    provider,
    options: { redirectTo: new URL('index.html', location.href).href },
  });
  if (error) console.error(error);
}
