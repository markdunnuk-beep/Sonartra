'use client';

import { useEffect, useId, useRef, useState } from 'react';

import {
  copyResultsLinkedInSharePost,
  trackResultsLinkedInOpenClicked,
  trackResultsLinkedInSharePanelVisibility,
  type ResultsLinkedInShareAnalytics,
} from '@/lib/results/linkedin-share-analytics';

const LINKEDIN_SHARE_URL = 'https://www.linkedin.com/feed/';

export type ResultLinkedInShareProps = {
  postBody: string;
  analytics: ResultsLinkedInShareAnalytics;
};

function LinkedInGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M6.94 8.75H3.56V20h3.38V8.75ZM5.25 3C4.16 3 3.28 3.9 3.28 5s.88 2 1.97 2c1.1 0 1.98-.9 1.98-2S6.35 3 5.25 3ZM20.72 13.1c0-3.38-1.8-4.95-4.2-4.95-1.93 0-2.8 1.06-3.28 1.8v-1.2H9.87c.04.8 0 11.25 0 11.25h3.37v-6.28c0-.34.03-.67.13-.9.27-.67.9-1.37 1.95-1.37 1.38 0 1.94 1.03 1.94 2.55V20h3.37v-6.9Z" />
    </svg>
  );
}

export function ResultLinkedInShare({ postBody, analytics }: ResultLinkedInShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const titleId = useId();
  const descriptionId = useId();
  const previewId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  function closePanel() {
    if (!isOpen) {
      return;
    }

    trackResultsLinkedInSharePanelVisibility({
      nextOpen: false,
      analytics,
    });
    setIsOpen(false);
    setCopyFeedback('');
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      trackResultsLinkedInSharePanelVisibility({
        nextOpen: false,
        analytics,
      });
      setIsOpen(false);
      setCopyFeedback('');
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        trackResultsLinkedInSharePanelVisibility({
          nextOpen: false,
          analytics,
        });
        setIsOpen(false);
        setCopyFeedback('');
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [analytics, isOpen]);

  useEffect(() => {
    if (!copyFeedback) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopyFeedback('');
    }, 2400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copyFeedback]);

  async function handleCopy() {
    const copied = await copyResultsLinkedInSharePost({
      postBody,
      analytics,
      clipboard: navigator.clipboard,
    });

    if (copied) {
      setCopyFeedback('Copied to clipboard');
    } else {
      setCopyFeedback('Copy failed');
    }
  }

  function handleOpenLinkedIn() {
    trackResultsLinkedInOpenClicked({
      analytics,
    });
    window.open(LINKEDIN_SHARE_URL, '_blank', 'noopener,noreferrer');
  }

  return (
    <div ref={panelRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Share on LinkedIn"
        aria-expanded={isOpen}
        aria-controls={previewId}
        onClick={() => {
          if (isOpen) {
            closePanel();
            return;
          }

          trackResultsLinkedInSharePanelVisibility({
            nextOpen: true,
            analytics,
          });
          setIsOpen(true);
          setCopyFeedback('');
        }}
        className="sonartra-button sonartra-share-trigger sonartra-focus-ring min-h-[2.9rem] rounded-full px-3.5 py-2 sm:px-4"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <LinkedInGlyph />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="text-[0.64rem] font-medium uppercase tracking-[0.16em] text-white/44">
            Share
          </span>
          <span className="mt-1 text-[0.92rem] font-semibold tracking-[0.005em] text-white/92">
            On LinkedIn
          </span>
        </span>
      </button>

      {isOpen ? (
        <div
          id={previewId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="sonartra-motion-reveal-soft sonartra-share-panel absolute left-0 right-auto top-[calc(100%+0.85rem)] z-20 w-[min(32rem,calc(100vw-2.5rem))] rounded-[1.55rem] border p-4 sm:left-auto sm:right-0 sm:w-[31rem] sm:p-5 md:p-6"
        >
          <div className="space-y-5 md:space-y-6">
            <div className="space-y-2.5">
              <p className="sonartra-report-kicker text-white/46">LinkedIn share</p>
              <h2 id={titleId} className="sonartra-report-title text-[1.12rem] leading-7 text-white md:text-[1.2rem]">
                Share your Sonartra result
              </h2>
              <p
                id={descriptionId}
                className="sonartra-report-body-soft max-w-[27rem] text-[0.94rem] leading-7 text-white/60"
              >
                A considered LinkedIn post, prepared from your persisted Sonartra result and ready
                to take with you.
              </p>
            </div>

            <div className="sonartra-share-panel-divider border-t pt-4 md:pt-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="sonartra-report-kicker text-white/44">Post preview</p>
                  <p className="sonartra-type-caption text-white/42">Read only</p>
                </div>

                <div className="sonartra-share-preview rounded-[1.2rem] border p-4 md:p-5">
                  <textarea
                    readOnly
                    aria-label="LinkedIn post preview"
                    value={postBody}
                    className="sonartra-scrollbar min-h-[15rem] w-full resize-none bg-transparent text-[0.95rem] leading-7 text-white/84 outline-none md:min-h-[15.5rem]"
                  />
                </div>
              </div>
            </div>

            <div className="sonartra-share-panel-divider flex flex-col gap-3 border-t pt-4 md:gap-3.5 md:pt-5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="sonartra-button sonartra-button-primary sonartra-focus-ring min-w-[11.5rem] justify-center"
                >
                  Copy LinkedIn Post
                </button>
                <button
                  type="button"
                  onClick={handleOpenLinkedIn}
                  className="sonartra-button sonartra-button-secondary sonartra-focus-ring min-w-[9.5rem] justify-center"
                >
                  Open LinkedIn
                </button>
              </div>

              <div className="min-h-6">
                {copyFeedback ? (
                  <p
                    className={[
                      'inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-medium tracking-[0.08em] uppercase',
                      copyFeedback === 'Copied to clipboard'
                        ? 'sonartra-share-feedback'
                        : 'sonartra-share-feedback-muted',
                    ].join(' ')}
                    aria-live="polite"
                  >
                    {copyFeedback}
                  </p>
                ) : (
                  <p className="sonartra-type-caption text-white/38" aria-live="polite">
                    Copy the post first, then continue into LinkedIn.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
