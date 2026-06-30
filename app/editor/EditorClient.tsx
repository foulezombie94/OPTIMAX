'use client';

import dynamic from 'next/dynamic';

const ProEditorLayout = dynamic(() => import('@/components/ProEditor/ProEditorLayout'), {
  ssr: false,
});

export default function EditorClient() {
  return <ProEditorLayout />;
}
