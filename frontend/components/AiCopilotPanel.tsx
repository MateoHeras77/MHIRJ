'use client';

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { LoaderCircle, Send, Sparkles, Square, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { COPILOT_DISCLAIMER, COPILOT_SUGGESTED_PROMPTS, COPILOT_TITLE } from '@/lib/copilot';
import { cn } from '@/lib/utils';

type AiCopilotPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AiCopilotPanel({ open, onOpenChange }: AiCopilotPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { messages, sendMessage, status, stop, error } = useChat();
  const isWorking = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (!open) return;

    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, open, status]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  const submitPrompt = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isWorking) return;

    sendMessage({ text: trimmed });
    setInput('');
  };

  const handleComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitPrompt(input);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close MHIRJ Co-Pilot overlay"
        onClick={() => onOpenChange(false)}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/30 transition-opacity lg:bg-transparent',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        className={cn(
          'fixed inset-x-3 top-3 bottom-3 z-50 w-auto transition-all duration-200 ease-out sm:inset-x-auto sm:right-5 sm:top-auto sm:bottom-5 sm:h-[min(720px,calc(100dvh-2.5rem))] sm:w-[440px] lg:w-[460px] print:hidden',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
        )}
      >
        <Card className="flex h-full gap-0 overflow-hidden border-slate-200 bg-white/98 py-0 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur">
          <CardHeader className="shrink-0 border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base text-slate-950">
                  <Sparkles className="size-4 text-[#003DA5]" aria-hidden="true" />
                  {COPILOT_TITLE}
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-600">
                  Ask for strategic takeaways from the current YYZ CRJ market snapshot.
                </CardDescription>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Close MHIRJ Co-Pilot"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 px-0">
            <div ref={scrollRef} className="h-full overflow-y-auto px-5 py-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-slate-700">
                {COPILOT_DISCLAIMER}
              </div>

              {messages.length === 0 ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Start with a strategy question</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This copilot is optimized for market share framing, airline targeting, route prioritization, and CRJ competitive positioning.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {COPILOT_SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => submitPrompt(prompt)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm leading-6 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                {messages.map((message) => {
                  const textParts = message.parts.filter((part) => part.type === 'text');
                  if (textParts.length === 0) return null;

                  const isAssistant = message.role !== 'user';

                  return (
                    <div
                      key={message.id}
                      className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}
                    >
                      <div
                        className={cn(
                          'max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm',
                          isAssistant
                            ? 'border border-slate-200 bg-slate-50 text-slate-800'
                            : 'bg-[#003DA5] text-white',
                        )}
                      >
                        <p
                          className={cn(
                            'mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]',
                            isAssistant ? 'text-slate-500' : 'text-blue-100',
                          )}
                        >
                          {isAssistant ? 'Co-Pilot' : 'You'}
                        </p>

                        <div className="space-y-2 whitespace-pre-wrap">
                          {textParts.map((part, index) => (
                            <p key={`${message.id}-${index}`}>{part.text}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isWorking ? (
                  <div className="flex justify-start">
                    <div className="flex max-w-[88%] items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
                      <LoaderCircle className="size-4 animate-spin text-[#003DA5]" aria-hidden="true" />
                      Thinking through the route brief...
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    {error.message || 'The copilot could not answer right now.'}
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>

          <CardFooter className="shrink-0 border-t border-slate-200 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:py-4">
            <form
              className="w-full space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                submitPrompt(input);
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.currentTarget.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Ask about route targeting, Porter defense, or CRJ market share..."
                rows={3}
                className="min-h-[112px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#003DA5] focus:bg-white sm:min-h-[88px] sm:text-sm"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="order-2 text-[11px] leading-5 text-slate-500 sm:order-1">
                  Keep questions tied to the current YYZ snapshot for the strongest answers.
                </p>

                <div className="order-1 flex items-center justify-end gap-2 sm:order-2">
                  {isWorking ? (
                    <Button type="button" variant="outline" size="icon" onClick={() => stop()} aria-label="Stop response">
                      <Square className="size-3.5 fill-current" aria-hidden="true" />
                    </Button>
                  ) : null}

                  <Button type="submit" className="bg-[#003DA5] text-white hover:bg-[#003DA5]/90" disabled={isWorking || input.trim().length === 0}>
                    <Send className="size-4" aria-hidden="true" />
                    Send
                  </Button>
                </div>
              </div>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}