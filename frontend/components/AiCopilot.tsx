'use client';

import dynamic from 'next/dynamic';
import { startTransition, useState } from 'react';
import { Bot } from 'lucide-react';

import { Button } from '@/components/ui/button';

const AiCopilotPanel = dynamic(
  () => import('@/components/AiCopilotPanel').then((mod) => mod.AiCopilotPanel),
  { loading: () => null },
);

export function AiCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const openPanel = () => {
    startTransition(() => {
      setHasOpened(true);
      setIsOpen(true);
    });
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        <Button
          type="button"
          size="lg"
          onClick={openPanel}
          className={[
            'rounded-full bg-slate-950 px-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] hover:bg-slate-900',
            isOpen ? 'pointer-events-none opacity-0' : 'opacity-100',
          ].join(' ')}
          aria-label="Open MHIRJ Co-Pilot"
        >
          <Bot className="size-4" aria-hidden="true" />
          MHIRJ Co-Pilot
        </Button>
      </div>

      {hasOpened ? <AiCopilotPanel open={isOpen} onOpenChange={setIsOpen} /> : null}
    </>
  );
}