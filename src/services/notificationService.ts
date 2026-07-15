export async function notifyCompletion(subject: string): Promise<void> {
  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification');

    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === 'granted';
    }

    if (granted) {
      sendNotification({
        title: '学习计时完成！',
        body: `科目：${subject || '学习'} · 专注时光已结束，休息一下吧 🌿`,
      });
    }
  } catch (error) {
    console.error('Failed to send completion notification:', error);
  }
}
