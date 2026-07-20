# Verify toolchain readiness

Type: task
Status: resolved

## Question

Confirm the machine can build and run a Tauri v2 app on **both** desktop (macOS) and Android before any app code is scaffolded. The user reports the toolchain is fully set up — this ticket verifies that claim with a smoke check, and resolves with a note of exact versions (later tickets depend on them).

Check and record:

- `rustc --version`, `cargo --version` (Rust stable present)
- `node --version`, and the package manager in use (`pnpm`/`npm`)
- Tauri CLI reachable (`cargo tauri --version` or `pnpm tauri --version`)
- `cargo tauri info` — read its doctor-style output for missing desktop deps
- Android: `JAVA_HOME`, Android Studio + SDK, NDK installed, `ANDROID_HOME`/`NDK_HOME` exported; `adb devices` shows a connected device or a running emulator

Resolve when all of the above are confirmed working (or the gap is identified and closed). Answer records the versions and the Android device/emulator that will be used for ticket 09.

## Answer

The machine was **not** fully set up as reported. Desktop is now green; the Android-specific gaps are deferred to ticket 09 per the user's call ("Rust now, Android at 09").

**Confirmed working / fixed this session:**
- **Rust:** upgraded 1.67.0 → **1.97.1** via `rustup update stable` (was below Tauri v2's ≥1.77 floor — would have broken ticket 05). rustup 1.25.2.
- **Android Rust targets:** added all four — `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android`.
- **Node** v22.22.0, **npm** 10.9.4. **pnpm** 7.27.0 (old but functional).
- **Xcode Command Line Tools** at `/Library/Developer/CommandLineTools` — desktop macOS builds OK.
- **Android SDK** at `/Users/paulperson/Library/Android/sdk` (`ANDROID_HOME` set); platforms 29–33; **adb** 1.0.41.
- **Emulator for ticket 09:** several AVDs exist; use **`Pixel_3a_API_33_arm64-v8a`** (arm64 matches the host, fastest). Others: `Pixel_6_Pro_API_33`, `Android_12`, etc. No physical device currently connected (`adb devices` empty).

**Desktop toolchain (ticket 05): READY.** Only Rust blocked it; now fixed.

**Android setup still outstanding — checklist for ticket 09 (blocks 09, not 05):**
1. **NDK not installed** (`NDK_HOME` empty, no `ndk/` under SDK). Install e.g. `sdkmanager "ndk;26.1.10909125"` (or via Android Studio SDK Manager) and export `NDK_HOME=$ANDROID_HOME/ndk/<version>`.
2. **JDK 17+ needed** — active JDK is 11 (`JAVA_HOME=/opt/homebrew/opt/openjdk@11`); Tauri v2 Android (AGP) needs 17+. `openjdk@21` and `@23` are already brew-installed; for the Android work set `JAVA_HOME=/opt/homebrew/opt/openjdk@21` (no new install needed).
3. Also unset/ignore: `ANDROID_SDK_ROOT` is empty but `ANDROID_HOME` is set — Tauri uses `ANDROID_HOME`, so fine; export `NDK_HOME` is the key missing var.

Nothing here changes the desktop path. Tauri CLI is not installed globally — expected; it comes in with the scaffold (ticket 05).
