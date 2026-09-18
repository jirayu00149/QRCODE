// Read-only project readiness check. Credentials stay inside Firebase CLI's auth client.
const { getGlobalDefaultAccount, getProjectDefaultAccount } = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
async function main() {
  const project = 'qrcode-47974';
  const account = getProjectDefaultAccount(process.cwd()) || getGlobalDefaultAccount();
  if (!account) throw new Error('Run firebase login first.');
  await requireAuth({ project, user: account.user, tokens: account.tokens, nonInteractive: true });
  const api = new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', auth: true });
  const result = await api.get(`/admin/v2/projects/${project}/config`, { skipLog: { resBody: true } });
  console.log(JSON.stringify({ project, emailPasswordEnabled: result.body.signIn?.email?.enabled ?? false, authorizedDomains: result.body.authorizedDomains || [] }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
