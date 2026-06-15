import { useEffect, useState } from 'react';

function appEstInstallee() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installee, setInstallee] = useState(false);

  useEffect(() => {
    setInstallee(appEstInstallee());

    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
    }

    function onAppInstalled() {
      setInstallee(true);
      setPromptEvent(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  async function installer() {
    if (!promptEvent) return;

    promptEvent.prompt();
    const choix = await promptEvent.userChoice;
    if (choix.outcome === 'accepted') {
      setInstallee(true);
    }
    setPromptEvent(null);
  }

  if (installee || !promptEvent) return null;

  return (
    <button className="btn-ghost" type="button" onClick={installer}>
      Installer
    </button>
  );
}
