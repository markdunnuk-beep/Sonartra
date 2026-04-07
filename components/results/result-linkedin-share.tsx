'use client';

import { useId, useState } from 'react';

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
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Share on LinkedIn"
        aria-expanded={isOpen}
        aria-controls={previewId}
        onClick={() => {
          const nextOpen = !isOpen;
          trackResultsLinkedInSharePanelVisibility({
            nextOpen,
            analytics,
          });
          setIsOpen(nextOpen);
          setCopyFeedback('');
        }}
        className="sonartra-motion-button sonartra-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-semibold tracking-[0.01em] text-white/88 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur"
      >
        <LinkedInGlyph />
        <span>Share on LinkedIn</span>
      </button>

      {isOpen ? (
        <div
          id={previewId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="sonartra-motion-reveal-soft absolute right-0 top-[calc(100%+0.9rem)] z-20 w-[min(30rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,29,49,0.96),rgba(10,17,31,0.96))] p-5 shadow-[0_28px_64px_rgba(0,0,0,0.34)] backdrop-blur md:p-6"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="sonartra-report-kicker">LinkedIn share</p>
              <h2 id={titleId} className="sonartra-report-title text-[1.12rem] text-white">
                Share your Sonartra result
              </h2>
              <p id={descriptionId} className="sonartra-report-body-soft max-w-[26rem] text-sm leading-7">
                This creates a ready-to-copy LinkedIn post based on your persisted Sonartra result.
              </p>
            </div>

            <div className="rounded-[1.15rem] border border-white/8 bg-black/10 p-4">
              <textarea
                readOnly
                aria-label="LinkedIn post preview"
                value={postBody}
                className="sonartra-scrollbar min-h-[14rem] w-full resize-none bg-transparent text-sm leading-7 text-white/84 outline-none"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="sonartra-button sonartra-button-primary sonartra-focus-ring"
                >
                  Copy LinkedIn Post
                </button>
                <button
                  type="button"
                  onClick={handleOpenLinkedIn}
                  className="sonartra-button sonartra-button-secondary sonartra-focus-ring"
                >
                  Open LinkedIn
                </button>
              </div>

              <p
                className="sonartra-type-caption min-h-5 text-left text-white/62 sm:text-right"
                aria-live="polite"
              >
                {copyFeedback}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
