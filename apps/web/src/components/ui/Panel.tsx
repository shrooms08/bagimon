import { type HTMLAttributes, type ReactNode } from 'react';
import styles from './Panel.module.css';

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
  tight?: boolean;
  children: ReactNode;
}

export function Panel({
  as = 'div',
  tight = false,
  className,
  children,
  ...rest
}: PanelProps) {
  const Tag = as;
  const cls = [styles.panel, tight ? styles.tight : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
