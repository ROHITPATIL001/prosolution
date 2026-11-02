'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { buttonClass, dangerButtonClass, secondaryButtonClass } from './styles';

type Variant = 'primary' | 'secondary' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: buttonClass,
  secondary: secondaryButtonClass,
  danger: dangerButtonClass,
};

/**
 * Submit button that shows a loading label while its form is being sent.
 * Reads the pending state from the surrounding <form>.
 */
export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  variant = 'primary',
  className = '',
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${VARIANTS[variant]} ${className}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
