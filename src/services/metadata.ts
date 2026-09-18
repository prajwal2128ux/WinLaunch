import { buildApiUrl } from './apiConfig';

export interface ScrapedMetadata {
  url: string;
  title: string;
  description: string;
  favicon: string;
  domain: string;
}

export async function fetchWebsiteMetadata(rawUrl: string): Promise<ScrapedMetadata> {
  let url = rawUrl.trim();
  if (!url) {
    throw new Error('URL cannot be empty');
  }

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  let domain = '';
  try {
    const parsed = new URL(url);
    domain = parsed.hostname;
  } catch {
    throw new Error('Please enter a valid URL (e.g., https://example.com)');
  }

  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  const cleanDomain = domain.replace(/^www\./i, '');
  const fallbackTitle = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);

  try {
    const response = await fetch(buildApiUrl(`/api/metadata?url=${encodeURIComponent(url)}`), {
      headers: { Accept: 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        url: data.url || url,
        title: data.title || fallbackTitle,
        description: data.description || '',
        favicon: data.favicon || defaultFavicon,
        domain: data.domain || domain
      };
    }
  } catch {
    // Backend API fetch failed, fallback gracefully to client-side heuristics
  }

  return {
    url,
    title: fallbackTitle,
    description: '',
    favicon: defaultFavicon,
    domain
  };
}
