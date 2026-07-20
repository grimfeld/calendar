import { authenticate, checkStatus } from "@tauri-apps/plugin-biometric";
import { isAndroid, isTauri } from "@/lib/reminders";

/**
 * Biometric unlock gates the persisted PB session on mobile: the session
 * token stays in localStorage, but the UI stays locked until the OS biometric
 * prompt succeeds. Desktop/browser have no biometric surface — no gate.
 */
export async function biometricAvailable(): Promise<boolean> {
  if (!isTauri() || !isAndroid()) return false;
  try {
    return (await checkStatus()).isAvailable;
  } catch {
    return false;
  }
}

export async function biometricUnlock(): Promise<boolean> {
  try {
    await authenticate("Unlock your calendar");
    return true;
  } catch {
    return false;
  }
}
