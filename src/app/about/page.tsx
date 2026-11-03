import type { Metadata } from 'next';
import AboutPresentation from '@/components/about-presentation';

export const metadata: Metadata = {
  title: 'About ProSolution · Strategic Blueprint & Scalability Architecture',
  description:
    'Comprehensive strategic architecture, sustainability diagnostic, and enterprise scalability blueprint for ProSolution.',
};

export default function AboutPage() {
  return <AboutPresentation />;
}
