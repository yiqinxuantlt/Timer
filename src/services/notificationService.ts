import type { PomodoroPhase } from '../types';

export async function notifyCompletion(
  subject: string,
  phase: PomodoroPhase | null = null
): Promise<void> {
  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification');

    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === 'granted';
    }

    if (granted) {
      const title =
        phase === 'focus'
          ? '番茄钟专注完成！'
          : phase === 'shortBreak'
            ? '短休息结束'
            : phase === 'longBreak'
              ? '长休息结束'
              : '学习计时完成！';
      const body = phase
        ? phase === 'focus'
          ? `科目：${subject || '学习'} · 可以开始休息了 🌿`
          : '休息阶段结束，确认后进入下一阶段。'
        : `科目：${subject || '学习'} · 专注时光已结束，休息一下吧 🌿`;

      sendNotification({ title, body });
    }
  } catch (error) {
    console.error('Failed to send completion notification:', error);
  }
}
