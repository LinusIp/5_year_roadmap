import { useEffect, useState } from 'react';
import { db } from '../../db/db.ts';
import { DEFAULT_BLOG_SETTINGS, checkBlogPost, saveBlogSettings, useBlogSettings } from '../../db/blog.ts';
import { detectPost } from '../../lib/blog-detect.ts';
import { today } from '../../lib/dates.ts';
import { Row, RowList } from '../../ui/Row.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Section } from './shared.tsx';

/** A link Atlas may open: https only. */
function isLink(text: string): boolean {
  try {
    return new URL(text).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Settings › Blog (DAILY-BLOG): where "Open my blog" goes, and the optional detection of the day's post in the blog's
 * repository. Both are this device's, like the GitHub token: kept on the device, not in the synced settings.
 */
export function BlogSettings() {
  const blog = useBlogSettings();
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (blog && link === null) setLink(blog.editorLink);
  }, [blog, link]);
  if (!blog) return <Section id="blog" title="Blog" children={null} />;

  const saveLink = (): void => {
    const value = (link ?? '').trim() || DEFAULT_BLOG_SETTINGS.editorLink;
    if (!isLink(value)) {
      setLinkError('Paste a full https:// link, like the one your browser shows on your posts in Pages CMS.');
      return;
    }
    setLinkError(null);
    setLink(value);
    void saveBlogSettings((s) => ({ ...s, editorLink: value }));
  };

  const setDetect = async (on: boolean): Promise<void> => {
    setMessage(null);
    if (!on) {
      await saveBlogSettings((s) => ({ ...s, autoDetect: false }));
      return;
    }
    // Turned on only once the blog's posts folder can be read: otherwise it says how to give the token access.
    setBusy(true);
    const token = (await db.secrets.get('github'))?.token ?? '';
    const result = await detectPost(today(), blog, token);
    setBusy(false);
    if (result.kind === 'no-access' || result.kind === 'error') {
      setMessage(result.message);
      return;
    }
    await saveBlogSettings((s) => ({ ...s, autoDetect: true }));
    if (result.kind === 'found') await checkBlogPost(today(), { force: true });
    setMessage(result.kind === 'found' ? 'On. Today’s post is already there: the day is marked posted.' : 'On. Atlas reads ' + blog.repo + ' once an evening and marks the day when a post dated that day is there.');
  };

  return (
    <Section id="blog" title="Blog">
      <div className="flex flex-col gap-3">
        <TextField
          label="Editor link"
          type="url"
          autoComplete="off"
          value={link ?? blog.editorLink}
          onChange={(v) => {
            setLink(v);
            setLinkError(null);
          }}
          onBlur={saveLink}
          error={linkError}
          hint="Where Open my blog goes: Pages CMS, or the link of your posts collection in it."
        />
      </div>
      <RowList flat className="mt-4">
        <Row
          title="Detect my post automatically"
          meta={'Reads ' + blog.repo + ' (' + blog.postsFolder + ') for a post dated that day. Read-only: Atlas never writes to your blog.'}
          toggle={{ on: blog.autoDetect, onChange: (on) => void setDetect(on), ...(busy ? { disabled: true } : {}) }}
        />
      </RowList>
      {(busy || message) && (
        <p role="status" className="mt-2 px-1 text-meta text-ink2">
          {busy ? 'Looking at ' + blog.repo + '…' : message}
        </p>
      )}
    </Section>
  );
}
