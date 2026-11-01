import type { ComponentChildren } from 'preact';
import type { SignInState } from '../lib/messages.ts';
import { Loader } from './Loader.tsx';
import { Octicon } from './Octicon.tsx';

type Step = Exclude<SignInState, { status: 'idle' }>;

const PRIMARY = 'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700';
const SECONDARY =
  'flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border border-solid border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 no-underline hover:bg-zinc-50';
const CANCEL =
  'h-7 cursor-pointer self-center rounded-md border-0 bg-transparent px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900';

/** A sign-in step in the popup, laid out as the welcome screen: a title, what to do, then its actions in the footer. */
export function PopupSignIn({
  state,
  server,
  onCancel,
  onRetry,
  onAllow,
}: {
  state: Step;
  server: string;
  onCancel: () => void;
  onRetry: () => void;
  onAllow: () => void;
}) {
  const cancel = (
    <button type="button" onClick={onCancel} class={state.status === 'waiting' ? SECONDARY : CANCEL}>
      Cancel
    </button>
  );

  if (state.status === 'waiting') {
    const waiting = <Loader label="Waiting for your approval…" />;
    return state.flow === 'device-grant' ? (
      <Step
        title="Approve this browser"
        footer={
          <div class="flex gap-2">
            <a href={state.verificationUri} target="_blank" rel="noopener" class={SECONDARY}>
              Open the page again
            </a>
            {cancel}
          </div>
        }
      >
        <p class="m-0 text-[13px] leading-relaxed text-zinc-600">On {server}, in the tab that just opened, check that it shows this code:</p>
        <p
          data-user-code
          class="m-0 rounded-lg border border-solid border-zinc-200 bg-zinc-50 py-3 text-center font-mono text-2xl font-semibold tracking-[0.2em]"
        >
          {state.userCode}
        </p>
        {waiting}
      </Step>
    ) : (
      <Step title="Approve this browser" footer={<div class="flex gap-2">{cancel}</div>}>
        <p class="m-0 text-[13px] leading-relaxed text-zinc-600">On {server}, in the tab that just opened, approve this browser as one of your devices.</p>
        {waiting}
      </Step>
    );
  }

  if (state.status === 'needs-permission') {
    return (
      <Step
        title="One more permission"
        footer={
          <>
            <button type="button" onClick={onAllow} class={PRIMARY}>
              Allow and continue
            </button>
            {cancel}
          </>
        }
      >
        <p class="m-0 text-[13px] leading-relaxed text-zinc-600">
          This /dev/null server signs browsers in through a redirect. To catch it, the extension needs to see where the sign-in tab goes. It only looks for its
          own redirect.
        </p>
      </Step>
    );
  }

  return (
    <Step
      title="Couldn't connect"
      footer={
        <>
          <button type="button" onClick={onRetry} class={PRIMARY}>
            <Octicon name="mark-github" />
            Try again with GitHub
          </button>
          {cancel}
        </>
      }
    >
      <p class="m-0 text-[13px] leading-relaxed text-red-700">{state.message}</p>
    </Step>
  );
}

function Step({ title, children, footer }: { title: string; children: ComponentChildren; footer: ComponentChildren }) {
  return (
    <>
      <section class="flex flex-col gap-3 px-6 py-4">
        <h1 class="m-0 text-xl font-bold leading-tight tracking-tight">{title}</h1>
        {children}
      </section>
      <footer class="flex flex-col gap-2 border-0 border-t border-solid border-zinc-200 p-4">{footer}</footer>
    </>
  );
}
