# 04 — Android → PocketBase network reachability (research)

**Ticket goal:** de-risk how the Tauri v2 Android build reaches PocketBase 0.39.8 running on the
Mac at `http://127.0.0.1:8090` (plain HTTP, public API rules), *before* the Android build ticket (09).

## Recommended path (emulator-first)

Use **`adb reverse tcp:8090 tcp:8090`** and have the app call **`http://127.0.0.1:8090`** (equivalently
`http://localhost:8090`). This works identically on the `Pixel_3a_API_33_arm64-v8a` emulator **and** on a
USB-connected physical phone, and it is the recommended path for *both*. Reason: `adb reverse` maps the
phone's own loopback to the Mac's loopback, so the app keeps using the loopback hostname — which is the
one hostname that is **exempt from WebView mixed-content blocking** (the Tauri WebView page is served from
`https://tauri.localhost`, so any `http://` fetch to a *non-loopback* host such as `10.0.2.2` or a LAN IP
is blocked as active mixed content, and is also treated as a non-secure context). You must **still** add a
cleartext-traffic exception to the Android manifest (Section 2): Android's OS-level cleartext policy blocks
plain `http://` to *any* host — including loopback — when the app targets a modern API level, independent
of the mixed-content rule. So the two required steps for the emulator are: (1) `adb reverse tcp:8090 tcp:8090`,
(2) allow cleartext to `127.0.0.1`/`localhost` via `network_security_config.xml`. No CORS change is needed
(Section 3). `10.0.2.2` and LAN-IP are documented below as fallbacks, but `adb reverse` + loopback is strictly
better because it preserves a secure context and needs no per-machine IP.

---

## 1. Network path

Three candidate routes from the Android app to PocketBase on the Mac:

| Route | Works on | App base URL | Needs | Secure context / mixed-content? |
|---|---|---|---|---|
| **`adb reverse tcp:8090 tcp:8090`** (recommended) | emulator **and** USB device | `http://127.0.0.1:8090` | adb + USB (device) / always (emulator) | loopback → **exempt**, stays secure context |
| Emulator alias `10.0.2.2` | emulator only | `http://10.0.2.2:8090` | nothing extra | **NOT** loopback → mixed-content blocked from `https://tauri.localhost`, non-secure context |
| Bind PB to `0.0.0.0` + Mac LAN IP | device/emulator on same Wi‑Fi | `http://<mac-lan-ip>:8090` | `./pocketbase serve --http=0.0.0.0:8090`, same subnet, firewall allow | LAN IP not loopback → mixed-content blocked, non-secure context |

### adb reverse (recommended for emulator AND physical device)

```bash
# one-time per session, after the device/emulator is connected and visible:
adb devices                      # confirm the target is listed
adb reverse tcp:8090 tcp:8090    # phone's localhost:8090 -> Mac's 127.0.0.1:8090
adb reverse --list               # verify the mapping
# app then talks to http://127.0.0.1:8090  (no PB rebind needed; PB stays on 127.0.0.1:8090)
```

- Android's own guidance recommends `adb reverse` (or Chrome DevTools port-forwarding) over `10.0.2.2`
  precisely because it lets the app keep using the trusted `localhost` hostname and preserves a secure
  context. https://developer.android.com/develop/ui/views/layout/webapps/access-local-server
- **Caveat — must re-run:** the reverse mapping is dropped when the device disconnects/reconnects, the
  emulator is cold-booted, or the adb server restarts. Re-run `adb reverse tcp:8090 tcp:8090` after any of
  those. On the emulator it also needs re-running after each fresh emulator launch.
- **Interaction with `tauri android dev`:** Tauri manages port-forwarding for *its own Vite dev-server*
  port during `tauri android dev`; it does **not** know about PocketBase's 8090, so you run the 8090
  reverse yourself. Running your `adb reverse tcp:8090 tcp:8090` alongside `tauri android dev` is fine — it
  is an independent mapping. (Separately, Tauri's dev-server reachability itself is a known rough edge on
  real devices; see tauri-apps/tauri#11137 and #11137's fix of setting Vite `server.host`. That is about
  loading the *frontend*, not about our PB call, but it's the same class of localhost-vs-device issue.)
  https://github.com/tauri-apps/tauri/issues/11137

### Emulator alias `10.0.2.2` (fallback, emulator only)

`10.0.2.2` is the emulator's special alias for the host loopback (127.0.0.1 on the Mac).
https://developer.android.com/studio/run/emulator-networking (and the Android local-server page above).
It needs no adb and no PB rebind, **but**:
- It is **not** a loopback origin, so a `fetch('http://10.0.2.2:8090')` from the `https://tauri.localhost`
  WebView is active **mixed content** and will be blocked unless mixed content is explicitly allowed.
- The WebView does not treat `10.0.2.2` as a secure context (Android docs, above), so it also still needs
  the cleartext exception, and you'd have to whitelist `10.0.2.2` specifically.
- Emulator-only — useless for the physical phone later.

Use only if adb is unavailable; otherwise prefer `adb reverse`.

### Bind PB to `0.0.0.0` + Mac LAN IP (fallback, physical device without USB)

```bash
./pocketbase serve --http=0.0.0.0:8090   # PB now listens on all interfaces
# app talks to http://192.168.x.y:8090  (the Mac's LAN IP, `ipconfig getifaddr en0`)
```
Trade-offs: requires phone + Mac on the same Wi‑Fi/subnet, a macOS firewall allow for PB, exposes PB to
the LAN (acceptable here only because it's dev with public API rules — do not do this on untrusted
networks), the IP changes per network, and the LAN IP is again non-loopback → mixed-content + cleartext
config required. Reasonable when you cannot use USB/adb; otherwise inferior to `adb reverse`.

**Pick:** (a) emulator → `adb reverse` + `http://127.0.0.1:8090`. (b) physical device → `adb reverse` over
USB + `http://127.0.0.1:8090` (fall back to LAN-IP + `0.0.0.0` only if USB/adb is not an option).

---

## 2. Cleartext HTTP (the change ticket 09 must apply)

Android 9+ (API 28+) blocks cleartext `http://` by default. This is an **OS network-policy** layer,
separate from WebView mixed-content. Empirically, plain `http://localhost` from a Tauri Android app is
blocked until cleartext is allowed (tauri-apps/tauri#10506 — "Are http/localhost urls blocked in Android?";
https URLs worked, http did not). So **loopback is NOT auto-exempt from the OS cleartext policy** — you must
add an exception. (Contrast: loopback *is* auto-exempt from the *mixed-content* rule — Section 1 — those are
two different mechanisms.)

**File location in a Tauri v2 project** (created by `tauri android init`):

```
src-tauri/gen/android/app/src/main/AndroidManifest.xml
```

### Recommended: network security config (domain-scoped, not app-wide)

`android:usesCleartextTraffic` and `android:networkSecurityConfig` are mutually exclusive on Android 9+
(the manifest flag is ignored once a network-security-config is set), and the scoped config is the safer
choice because it permits cleartext only to the dev host, not the whole app.

1. Create `src-tauri/gen/android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- adb reverse path: loopback -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <!-- add these only if you fall back to the non-loopback routes: -->
        <domain includeSubdomains="true">10.0.2.2</domain>
        <!-- <domain includeSubdomains="true">192.168.x.y</domain>  Mac LAN IP -->
    </domain-config>
</network-security-config>
```

2. Reference it from the `<application>` element in `AndroidManifest.xml`:

```xml
<application
    ...
    android:networkSecurityConfig="@xml/network_security_config">
```

### Simpler alternative (dev-only, app-wide)

If you'd rather not manage a config file, add to the `<application>` tag instead (do **not** combine with
the config above):

```xml
<application
    ...
    android:usesCleartextTraffic="true">
```

This is blunter (allows cleartext to every host) but fine for a throwaway dev build. Prefer the scoped
config for anything you might ship.

### Does the edit survive regeneration? (important gotcha)

`gen/android/` is generated by `tauri android init`, but Tauri's guidance is that files under
`src-tauri/gen/android` **can be edited and committed to version control** as long as they are not the
build-time autogenerated files (those carry a `THIS IS AN AUTOGENERATED FILE` header — e.g.
`tauri.properties`). `AndroidManifest.xml` and `res/xml/network_security_config.xml` are **not** in that
autogenerated set, so hand-edits persist across normal builds.
- **BUT** re-running `tauri android init` (e.g. to pick up `tauri.conf.json` changes) can overwrite the
  manifest. Tauri v2 has **no** first-class `tauri.conf.json` field for arbitrary manifest attributes like
  `networkSecurityConfig`/`usesCleartextTraffic`, so the manifest edit is manual. **Mitigation:** commit
  `src-tauri/gen/android/` to git so an accidental regeneration is a one-line `git checkout` to restore.
  https://v2.tauri.app/develop/ (configuration-files / Android dev docs) and
  https://github.com/tauri-apps/tauri/issues/7820 (manifest-permissions discussion).

---

## 3. CORS — verdict: no change needed

- **PocketBase side:** PB's CORS `AllowOrigins` defaults to `["*"]` (all origins allowed); PB is stateless
  / cookieless so the wildcard default is safe. You can narrow it with `./pocketbase serve --origins=...`
  but there is no need to. So PB already accepts the Tauri WebView origin.
  https://pocketbase.io/jsvm/interfaces/apis.CORSConfig.html and
  https://github.com/pocketbase/pocketbase/discussions/3946
- **Tauri WebView origin:** the Android WebView serves the app from `https://tauri.localhost` (Tauri uses
  `https://tauri.localhost` on Android/Windows; `tauri.localhost` scheme per tauri-apps/tauri#3007). Even
  so, Tauri Webviews generally do not enforce CORS against the app's own `fetch`, and PB's `*` would satisfy
  it regardless. **Net: nothing to configure for CORS.** The real cross-origin-shaped risks here are
  mixed-content (Section 1) and cleartext (Section 2), not CORS.
  https://github.com/tauri-apps/tauri/issues/3007

---

## 4. Per-platform base URL strategy

The desktop build must keep hitting `http://127.0.0.1:8090`; the Android build also uses
`http://127.0.0.1:8090` **when the recommended `adb reverse` path is used** — so in the recommended setup
the base URL is actually the *same string* on both. A per-platform switch is still worth having so the
fallbacks (`10.0.2.2`, LAN IP) are a one-line change and don't need a rebuild-time hunt.

**Recommended approach: a Vite env var with a small runtime helper**, overridable per platform. Vite
statically replaces `import.meta.env.*` at build time, which is the cheapest and most predictable option
and needs no extra plugin.

`.env` (default / desktop):
```
VITE_PB_URL=http://127.0.0.1:8090
```

`.env.android` (only if you ever diverge from loopback, e.g. emulator via 10.0.2.2):
```
VITE_PB_URL=http://10.0.2.2:8090
```

`src/lib/pb.ts`:
```ts
import PocketBase from 'pocketbase';

// Single source of truth for the PB base URL.
// With the recommended `adb reverse` path this is http://127.0.0.1:8090 on every platform.
const baseUrl = import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090';

export const pb = new PocketBase(baseUrl);
```

Build/run:
```bash
# desktop + Android (recommended adb-reverse path): identical URL, nothing special
tauri dev
tauri android dev            # after: adb reverse tcp:8090 tcp:8090

# only if using the 10.0.2.2 fallback, load the android env file:
tauri android dev --  # (Vite: `--mode android` to pick .env.android)
```

**If you instead want true runtime detection** (one binary, decide at startup) use
`@tauri-apps/plugin-os`:
```ts
import { platform } from '@tauri-apps/plugin-os';
const p = platform();                      // 'android' | 'ios' | 'macos' | ...
const baseUrl = p === 'android' ? 'http://10.0.2.2:8090' : 'http://127.0.0.1:8090';
```
Recommendation: **use the env-var approach** — it's simpler, tree-shakes to a constant, and with the
`adb reverse` path you don't even need to branch. Reserve `plugin-os` detection for later if you ship a
build that must auto-pick a non-loopback host.

---

## Gotchas / things that will bite

- **`adb reverse` is not sticky.** Re-run `adb reverse tcp:8090 tcp:8090` after every emulator cold boot,
  USB reconnect, or `adb kill-server`. A silent "connection refused" in the app usually means the mapping
  was dropped.
- **Mixed content ≠ cleartext.** They are two independent blocks. Loopback (`127.0.0.1`/`localhost`) is
  auto-exempt from *mixed content* but NOT from the *cleartext* OS policy. Non-loopback hosts (`10.0.2.2`,
  LAN IP) trip *both*. This is why `adb reverse` + loopback is the least-friction route.
- **The WebView page is `https://tauri.localhost`.** Any `http://<non-loopback>` fetch is active mixed
  content and will be blocked in the Android WebView regardless of cleartext config — another reason to
  avoid `10.0.2.2`/LAN-IP unless forced.
- **`tauri android init` can clobber the manifest.** No `tauri.conf.json` field injects
  `networkSecurityConfig`/`usesCleartextTraffic` in Tauri v2 today, so the edit is manual — commit
  `src-tauri/gen/android/` to git to make regeneration recoverable.
- **`usesCleartextTraffic` vs `networkSecurityConfig` are mutually exclusive** on Android 9+. Don't set
  both; the manifest boolean is ignored when a config is present.
- **PB stays on `127.0.0.1:8090` for the recommended path** — you only rebind to `0.0.0.0` for the LAN-IP
  fallback, and that exposes PB to the local network (public API rules = anyone on the Wi‑Fi can read/write).
- **Emulator is ARM (`arm64-v8a`, API 33).** Nothing network-specific breaks, but ensure adb targets the
  right transport if a physical device is also attached (`adb -s <serial> reverse ...`).

## Uncertainties / where sources conflict

- I could not load the *comment/resolution* body of tauri-apps/tauri#10506 (GitHub returned a load error);
  the conclusion "plain http, including localhost, is blocked until cleartext is allowed" is inferred from
  the issue title/description plus the general Android cleartext policy and corroborating Flutter/Uno reports
  for `10.0.2.2`. If ticket 09 finds loopback works with *no* cleartext config on this specific API-33 image,
  that's a benign surplus — the config does no harm. Treat "cleartext exception required" as the safe default.
- Whether Tauri auto-runs `adb reverse` for any port other than its Vite dev-server port is not clearly
  documented; assume it does **not** forward 8090 and run it yourself.

### Sources
- Android — access local dev server / adb reverse / 10.0.2.2 not recommended: https://developer.android.com/develop/ui/views/layout/webapps/access-local-server
- Android emulator networking (`10.0.2.2`): https://developer.android.com/studio/run/emulator-networking
- Tauri #11137 — android dev + localhost dev-server on real devices: https://github.com/tauri-apps/tauri/issues/11137
- Tauri #10506 — http/localhost blocked on Android: https://github.com/tauri-apps/tauri/issues/10506
- Tauri #7820 — configuring Android manifest permissions: https://github.com/tauri-apps/tauri/issues/7820
- Tauri #3007 — `tauri.localhost` / https origin: https://github.com/tauri-apps/tauri/issues/3007
- Mixed content — loopback exempt (MDN): https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content
- Loopback = potentially trustworthy (WebKit/Chromium): https://bugs.webkit.org/show_bug.cgi?id=171934 ; https://groups.google.com/a/chromium.org/g/blink-dev/c/RC9dSw-O3fE
- Cleartext policy + network_security_config (Xamarin/OWASP): https://devblogs.microsoft.com/xamarin/cleartext-http-android-network-security/ ; https://mas.owasp.org/MASTG/tests/android/MASVS-NETWORK/MASTG-TEST-0235/
- `usesCleartextTraffic` vs network config mutual exclusivity, 10.0.2.2 cleartext: https://github.com/unoplatform/uno/discussions/11484
- PocketBase CORS default `["*"]` / `--origins`: https://pocketbase.io/jsvm/interfaces/apis.CORSConfig.html ; https://github.com/pocketbase/pocketbase/discussions/3946
- Tauri config files / editing & committing gen/android: https://v2.tauri.app/develop/configuration-files/
