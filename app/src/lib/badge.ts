/** Update the iOS/PWA app icon badge count via the Badging API. */
export async function setAppBadge(count: number): Promise<void> {
  if (!('setAppBadge' in navigator)) return;

  if (count > 0) {
    await navigator.setAppBadge(count);
  } else {
    await navigator.clearAppBadge();
  }
}
