# Reach local Pocketbase from the Android build

Type: research
Status: resolved

## Question

Determine how the app running on the Android phone/emulator talks to the Pocketbase instance running on the dev machine. This is the riskiest unknown in "both platforms" — `127.0.0.1` on the phone is the phone, not the laptop — so de-risk it before ticket 09 builds on it.

Investigate and decide:

- **Network path:** `adb reverse tcp:8090 tcp:8090` (USB/emulator maps phone's localhost → dev machine) vs. binding Pocketbase to `0.0.0.0` and using the dev machine's LAN IP (`http://192.168.x.x:8090`) with the phone on the same Wi-Fi. Note the emulator special case (`10.0.2.2`).
- **Cleartext HTTP:** local Pocketbase is `http://`, and Android blocks cleartext by default. Identify how a Tauri v2 Android app permits it (network security config / manifest `usesCleartextTraffic`, or a dev-only domain allowlist) and whether Tauri exposes a hook for it.
- **CORS:** whether the WKWebView/Android webview origin needs Pocketbase CORS adjustments.
- **Config strategy:** how the app selects the base URL per platform (desktop `127.0.0.1` vs Android host) — env var, build flag, or runtime detection.

Deliver a markdown summary (linked asset) with the recommended path and the exact config changes ticket 09 will apply. Resolve with that recommendation.

## Answer

**Recommended path: `adb reverse` + keep loopback everywhere.** Full detail + copy-paste snippets in the asset: [`assets/04-android-network.md`](../assets/04-android-network.md).

- **Network path (emulator AND physical device):** `adb reverse tcp:8090 tcp:8090`, app calls `http://127.0.0.1:8090`. PocketBase stays bound to `127.0.0.1:8090` — **no rebind**. Re-run the reverse after each emulator cold boot / adb restart. Fall back to PB `--http=0.0.0.0:8090` + Mac LAN IP only if USB/adb isn't available.
- **Why loopback wins:** the Android WebView serves the app from `https://tauri.localhost`, so `http://` to any non-loopback host (`10.0.2.2`, LAN IP) is **mixed content → blocked**; `127.0.0.1`/`localhost` are exempt from mixed-content blocking. `adb reverse` keeps loopback usable on the phone.
- **Cleartext fix (REQUIRED — separate from mixed content):** add `src-tauri/gen/android/app/src/main/res/xml/network_security_config.xml` permitting cleartext for `localhost`/`127.0.0.1`, and reference it with `android:networkSecurityConfig="@xml/network_security_config"` on `<application>` in `src-tauri/gen/android/app/src/main/AndroidManifest.xml`. (Dev-only alt: `android:usesCleartextTraffic="true"` — mutually exclusive, don't set both.) Loopback is NOT auto-exempt from the OS cleartext policy.
- **CORS:** no change. PocketBase defaults `AllowOrigins: ["*"]` and the Tauri WebView doesn't enforce CORS on its own fetches.
- **Base-URL strategy:** Vite env var `VITE_PB_URL` (default `http://127.0.0.1:8090`) read once in a `pb.ts` helper. With adb-reverse the URL is identical desktop + Android → **no runtime branch**; `@tauri-apps/plugin-os` `platform()` is the documented fallback if a non-loopback host is ever used.

**Caveats to carry into ticket 09:**
- `tauri android init` can overwrite the manifest and Tauri v2 has no config field to inject these attributes ⇒ **commit `src-tauri/gen/android/` to git** so regeneration is recoverable.
- Agent could not load the resolution comments of tauri#10506 (GitHub load error); the "cleartext exception required even for localhost" point is **inferred** from the issue title + Android policy + corroborating reports — flagged as the safe default. Verify empirically when ticket 09 runs the app.
