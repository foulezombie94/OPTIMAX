import { Metadata } from 'next';
import EditorClient from './EditorClient';

export const metadata: Metadata = {
  title: 'Optimax Pro Editor',
  description: 'Éditeur vidéo professionnel en ligne',
};

export default function EditorPage() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-[#070709] text-white">
      <EditorClient />
    </main>
  );
}
