import { lazy, Suspense, useEffect } from 'react';
import { GameProvider, useGame } from './app/store/GameProvider';
import { useGameKeys } from './app/hooks/useGameKeys';
import { initServiceWorker } from './app/pwa';
import { ModuleMap } from './app/screens/ModuleMap';
import { PlayScreen } from './app/screens/PlayScreen';
import { TitleScreen } from './app/screens/TitleScreen';
import { Toasts } from './app/ui/Toasts';
import { UpdatePrompt } from './app/ui/UpdatePrompt';

function Screens() {
  const { state } = useGame();
  useGameKeys();
  return (
    <>
      {state.screen === 'title' && <TitleScreen />}
      {state.screen === 'map' && <ModuleMap />}
      {state.screen === 'play' && state.session && <PlayScreen />}
      <Toasts />
      <UpdatePrompt />
    </>
  );
}

const Gallery = import.meta.env.DEV ? lazy(() => import('./app/dev/Gallery')) : null;

export default function App() {
  useEffect(() => initServiceWorker(), []);
  if (Gallery && location.search.includes('gallery')) {
    return (
      <Suspense>
        <Gallery />
      </Suspense>
    );
  }
  return (
    <GameProvider>
      <Screens />
    </GameProvider>
  );
}
