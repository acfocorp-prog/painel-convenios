import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando como PWA instalado.
    if (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // @ts-expect-error navigator.standalone existe no iOS Safari
      window.navigator?.standalone === true
    ) {
      setInstalled(true);
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function prompt() {
    if (!installEvent) return;
    await installEvent.prompt();
  }

  return {
    canInstall: !!installEvent,
    installed,
    prompt,
  };
}
