export async function getAppWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export async function minimizeWindow(): Promise<void> {
  const window = await getAppWindow();
  await window.minimize();
}

export async function closeWindow(): Promise<void> {
  const window = await getAppWindow();
  await window.close();
}

export async function setWindowAlwaysOnTop(enabled: boolean): Promise<void> {
  const window = await getAppWindow();
  await window.setAlwaysOnTop(enabled);
}

export async function resizeWindow(compact: boolean): Promise<void> {
  const { LogicalSize } = await import('@tauri-apps/api/window');
  const window = await getAppWindow();
  const size = compact ? new LogicalSize(220, 140) : new LogicalSize(320, 420);
  await window.setSize(size);
  await window.setMinSize(size);
}
