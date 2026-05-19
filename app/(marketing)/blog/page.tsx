import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/content/blog/posts';

export const metadata: Metadata = {
  title: 'Blog | Forge',
  description: 'Updates, product roadmap, and announcements from the Forge team.',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BlogIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">Blog</h1>
        <p className="text-lg text-muted-foreground">Updates, roadmap, and announcements from the Forge team.</p>
      </div>

      {/* Post list */}
      <div className="space-y-6">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block bg-card/40 hover:bg-card/70 border border-border hover:border-accent/30 rounded-2xl p-6 transition-all duration-200"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent/15 text-accent">
                  {tag}
                </span>
              ))}
              <span className="text-sm text-muted-foreground ml-auto">{formatDate(post.date)}</span>
            </div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors leading-snug">
              {post.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{post.excerpt}</p>
            <p className="mt-4 text-sm font-medium text-accent">Read more →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
