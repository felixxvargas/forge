import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts, getPost } from '@/content/blog/posts';
import './blog-post.css';

export function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: 'Post | Forge Blog' };
  return {
    title: `${post.title} | Forge Blog`,
    description: post.excerpt,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/og-image.png'],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const Content = post.content;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Blog
      </Link>

      {/* Post header */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {post.tags.map(tag => (
            <span key={tag} className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent/15 text-accent">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4">
          {post.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{post.author}</span>
          <span>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
      </header>

      {/* Post content */}
      <div className="blog-prose">
        <Content />
      </div>

      {/* Back link */}
      <div className="mt-16 pt-8 border-t border-border">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to blog
        </Link>
      </div>
    </div>
  );
}
