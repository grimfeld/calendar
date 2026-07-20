# Run on Android — both platforms round-trip

Type: task
Status: open
Blocked by: 08, 04

## Question

Get the working desktop app running on the Android phone/emulator and complete the event round-trip there — hitting the destination: the skeleton runs on **both** platforms.

**Prerequisites carried from ticket 01 (do these first — they block the Android build):**
- Install the Android **NDK**: `sdkmanager "ndk;26.1.10909125"` (or Android Studio SDK Manager), then `export NDK_HOME=$ANDROID_HOME/ndk/<version>`.
- Set **JDK 17+**: `export JAVA_HOME=/opt/homebrew/opt/openjdk@21` (already brew-installed; active default is JDK 11 which is too old for AGP).
- Rust Android targets are already installed (ticket 01). `ANDROID_HOME` is set; `NDK_HOME` is the key missing var.
- Emulator to target: **`Pixel_3a_API_33_arm64-v8a`** (arm64, matches host). No physical device is connected.

Do:

- `npm run tauri android init`, then `npm run tauri android dev` targeting the device/emulator from ticket 01.
- Apply the network + cleartext + CORS config decided in ticket 04 (see [`assets/04-android-network.md`](../assets/04-android-network.md)): (a) `adb reverse tcp:8090 tcp:8090` so the phone reaches `http://127.0.0.1:8090` (PB stays bound to 127.0.0.1 — no rebind, no per-platform URL branch); (b) add `network_security_config.xml` permitting cleartext for `localhost`/`127.0.0.1` and reference it from `AndroidManifest.xml` (`<application android:networkSecurityConfig=...>`); (c) CORS needs no change (PB defaults `*`). **Commit `src-tauri/gen/android/`** — `tauri android init` can overwrite the manifest. Re-run `adb reverse` after each emulator cold boot.
- Verify the calendar grid renders and is usable at phone screen size (touch, layout). **Watch:** the Android WebView has no native `Temporal`; the calendar depends on `import "temporal-polyfill/global"` in `main.tsx` (ticket 08) — confirm it loads before any Schedule-X code, or the grid renders empty/throws on the phone.
- Perform the round-trip on the phone: create an event → it persists to local Pocketbase → it appears on the grid, and is visible from the desktop app too (same backend).

Resolve when the same event round-trips on **both** desktop and Android against the local Pocketbase. This ticket reaching closed means the map's destination is reached. Answer records the Android run command, the applied network config, and any device-specific fixes.
