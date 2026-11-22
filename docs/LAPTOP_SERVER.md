# Run FocusEd AI on a laptop

This mode runs FocusEd AI on the host laptop and keeps shared records and
attachments in `laptop-data/focused.sqlite`. Students, teachers and parents
sign in from their own browsers using the same LAN address. The laptop must
stay awake, with the server running and connected to the network.

## Prepare the app

Install Node.js 24 and Bun 1.4.5. Download or clone this repository and open a
terminal in the project directory.

```sh
bun install --frozen-lockfile
npm run build:laptop
```

On the first start, choose an administrator email and a password of at least
12 characters. The server stores an Argon2id password hash. The existing
Vercel demo accounts and its browser-local records are separate.

## Start on a private demo network

Use this HTTP setup for sample accounts and coursework on a private demo
network. For real records, use the HTTPS setup below.

On macOS or Linux, run these commands in Bash.

```bash
export FOCUSED_ADMIN_EMAIL="admin@example.com"
read -rsp "New administrator password: " FOCUSED_ADMIN_PASSWORD; printf '\n'
export FOCUSED_ADMIN_PASSWORD
export FOCUSED_HOST="0.0.0.0"
export FOCUSED_ALLOW_HTTP_DEMO="1"
bun run start:laptop
```

On Windows, run these commands in PowerShell.

```powershell
$env:FOCUSED_ADMIN_EMAIL = "admin@example.com"
$credential = [pscredential]::new("admin", (Read-Host "New administrator password" -AsSecureString))
$env:FOCUSED_ADMIN_PASSWORD = $credential.GetNetworkCredential().Password
$env:FOCUSED_HOST = "0.0.0.0"
$env:FOCUSED_ALLOW_HTTP_DEMO = "1"
bun run start:laptop
```

The server prints the laptop's LAN URL. Open that address from each device on
the same network. For example, if it prints `http://192.168.1.20:8787/login`,
use that exact address on the other devices. If the firewall prompts for
access, allow the server on the private network. If devices cannot reach one
another, check whether the Wi-Fi isolates clients and ask the campus network
administrator about the demo network.

Log in as the administrator and use **User Management** to create accounts.
Use **Class Management** to assign a teacher and enrol students. Parents
accept a student's request under **My Children**. On later starts, the
administrator email and password environment variables can be omitted.

## HTTPS and records

For real records, set `FOCUSED_TLS_CERT` and `FOCUSED_TLS_KEY` to certificate
and private key files issued for the hostname the clients use. All clients
must trust the issuer. Keep `FOCUSED_HOST=0.0.0.0`, leave
`FOCUSED_ALLOW_HTTP_DEMO` unset, and give clients the HTTPS URL. Keep this
service on the intended private network. There is no need to forward a
public internet port.

Use one server process per database. To back up the workspace, stop the
server and copy the entire `laptop-data/` directory to a protected location.
Restart with the same directory to retain accounts, assignments and files.
The repository and the Vercel build do not include that database.

## Verify capacity

```sh
bun run test:laptop
```

This test starts a separate server and temporary SQLite database. It creates
100 independent student sessions, verifies concurrent submissions, checks
role-scoped access and private file downloads, runs the focus lock and parent
unlock workflow, and restarts the server to verify persistence.
