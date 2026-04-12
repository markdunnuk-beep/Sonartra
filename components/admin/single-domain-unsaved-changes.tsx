'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  isSingleDomainActionStateSuccess,
  serializeSingleDomainFormSnapshot,
  shouldBlockSingleDomainNavigation,
  SINGLE_DOMAIN_UNSAVED_CHANGES_MESSAGE,
  type SingleDomainAuthoringActionStateLike,
} from '@/lib/admin/single-domain-safe-authoring';

type SingleDomainUnsavedChangesContextValue = {
  setDirty: (id: string, dirty: boolean) => void;
};

const SingleDomainUnsavedChangesContext = createContext<SingleDomainUnsavedChangesContextValue | null>(null);

function buildFormSnapshot(form: HTMLFormElement): string {
  const entries: [string, string][] = [];

  for (const [key, value] of new FormData(form).entries()) {
    entries.push([key, typeof value === 'string' ? value : value.name]);
  }

  return serializeSingleDomainFormSnapshot(entries);
}

export function SingleDomainUnsavedChangesProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [dirtyForms, setDirtyForms] = useState<Record<string, boolean>>({});
  const hasDirtyChanges = Object.values(dirtyForms).some(Boolean);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyForms((current) => {
      if (!dirty) {
        if (!(id in current)) {
          return current;
        }

        const next = { ...current };
        delete next[id];
        return next;
      }

      if (current[id]) {
        return current;
      }

      return {
        ...current,
        [id]: true,
      };
    });
  }, []);

  useEffect(() => {
    if (!hasDirtyChanges) {
      return undefined;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = SINGLE_DOMAIN_UNSAVED_CHANGES_MESSAGE;
      return SINGLE_DOMAIN_UNSAVED_CHANGES_MESSAGE;
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasDirtyChanges]);

  useEffect(() => {
    if (!hasDirtyChanges) {
      return undefined;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const shouldBlock = shouldBlockSingleDomainNavigation({
        currentHref: window.location.href,
        nextHref: anchor.href,
        hasDirtyChanges,
        isModifiedEvent: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
        isPrimaryNavigation: event.button === 0,
        target: anchor.target,
        download: anchor.hasAttribute('download'),
      });

      if (!shouldBlock) {
        return;
      }

      if (window.confirm(SINGLE_DOMAIN_UNSAVED_CHANGES_MESSAGE)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [hasDirtyChanges]);

  useEffect(() => {
    if (!hasDirtyChanges) {
      return undefined;
    }

    function handlePopState() {
      if (window.confirm(SINGLE_DOMAIN_UNSAVED_CHANGES_MESSAGE)) {
        return;
      }

      window.history.go(1);
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasDirtyChanges]);

  const value = useMemo<SingleDomainUnsavedChangesContextValue>(
    () => ({
      setDirty,
    }),
    [setDirty],
  );

  return (
    <SingleDomainUnsavedChangesContext.Provider value={value}>
      {children}
    </SingleDomainUnsavedChangesContext.Provider>
  );
}

function useSingleDomainUnsavedChangesContext(): SingleDomainUnsavedChangesContextValue {
  const context = useContext(SingleDomainUnsavedChangesContext);

  if (!context) {
    throw new Error('SingleDomainUnsavedChangesContext is unavailable outside the single-domain builder.');
  }

  return context;
}

export function useSingleDomainDirtyForm(params: {
  state: SingleDomainAuthoringActionStateLike;
}) {
  const id = useId();
  const { setDirty } = useSingleDomainUnsavedChangesContext();
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitAttemptedRef = useRef(false);
  const baselineSnapshotRef = useRef<string | null>(null);

  const captureDirtyState = useCallback(() => {
    if (!formRef.current) {
      return;
    }

    const currentSnapshot = buildFormSnapshot(formRef.current);
    if (baselineSnapshotRef.current === null) {
      baselineSnapshotRef.current = currentSnapshot;
    }

    setDirty(id, currentSnapshot !== baselineSnapshotRef.current);
  }, [id, setDirty]);

  useEffect(() => {
    if (!formRef.current) {
      return;
    }

    baselineSnapshotRef.current = buildFormSnapshot(formRef.current);
    setDirty(id, false);

    return () => {
      setDirty(id, false);
    };
  }, [id, setDirty]);

  useEffect(() => {
    if (!submitAttemptedRef.current || !isSingleDomainActionStateSuccess(params.state) || !formRef.current) {
      return;
    }

    baselineSnapshotRef.current = buildFormSnapshot(formRef.current);
    submitAttemptedRef.current = false;
    setDirty(id, false);
  }, [id, params.state, setDirty]);

  return {
    formRef,
    onChange: captureDirtyState,
    onInput: captureDirtyState,
    onSubmit: () => {
      submitAttemptedRef.current = true;
    },
  };
}

export function useSingleDomainDirtyField() {
  const id = useId();
  const { setDirty } = useSingleDomainUnsavedChangesContext();

  useEffect(() => () => setDirty(id, false), [id, setDirty]);

  return useCallback((dirty: boolean) => {
    setDirty(id, dirty);
  }, [id, setDirty]);
}
