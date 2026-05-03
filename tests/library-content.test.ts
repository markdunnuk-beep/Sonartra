import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import sitemap from '@/app/sitemap';
import { LIBRARY_ARTICLES } from '@/lib/library/articles';
import { LIBRARY_CATEGORIES } from '@/lib/library/categories';
import { getLibraryArticleDetailViewModel } from '@/lib/library/library-article-view-model';
import {
  getLibraryArticleHref,
  getLibraryCategoryCta,
  getLibraryCategoryViewModel,
  getLibraryIndexViewModel,
} from '@/lib/library/library-browse-view-model';
import {
  getLibraryArticlePath,
  getLibraryArticleUrl,
  getLibraryCategoryPath,
  getLibraryCategoryUrl,
  getLibraryIndexUrl,
} from '@/lib/library/library-routes';
import {
  getLibraryArticleJsonLd,
  getLibraryArticleMetadataByPath,
  getLibraryCategoryMetadataByKey,
  getLibraryIndexMetadata,
} from '@/lib/library/library-seo';
import {
  getArticlesByCategory,
  getFeaturedLibraryArticles,
  getLibraryArticle,
  getLibraryArticles,
  getLibraryCategories,
  getLibraryCategory,
  getLibraryCategoryStaticParams,
  getLibraryStaticParams,
} from '@/lib/library/resolve-library-content';

const PUBLIC_ROUTE_HREFS = new Set(['/contact', '/platform', '/sign-up', '/sonartra-signals']);

function uniqueValues(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function getArticleBySlug(slug: string) {
  return LIBRARY_ARTICLES.filter((article) => article.slug === slug);
}

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function assertLibraryHrefExists(href: string): void {
  if (PUBLIC_ROUTE_HREFS.has(href)) {
    return;
  }

  const [, librarySegment, category, slug] = href.split('/');
  assert.equal(librarySegment, 'library', `CTA href must target a known public or library route: ${href}`);

  if (category && slug) {
    assert.ok(getLibraryArticle(category, slug), `CTA article href must resolve: ${href}`);
    return;
  }

  if (category) {
    assert.ok(getLibraryCategory(category), `CTA category href must resolve: ${href}`);
    return;
  }

  assert.equal(href, '/library');
}

test('library category keys are unique and deterministically ordered', () => {
  const categoryKeys = LIBRARY_CATEGORIES.map((category) => category.key);

  assert.deepEqual(categoryKeys, uniqueValues(categoryKeys));
  assert.deepEqual(
    getLibraryCategories().map((category) => category.key),
    [...LIBRARY_CATEGORIES]
      .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label))
      .map((category) => category.key),
  );
});

test('library article slugs are unique within each category', () => {
  for (const category of LIBRARY_CATEGORIES) {
    const slugs = LIBRARY_ARTICLES.filter((article) => article.category === category.key).map(
      (article) => article.slug,
    );

    assert.deepEqual(slugs, uniqueValues(slugs));
  }
});

test('library articles reference existing categories and have valid sections', () => {
  const categoryKeys = new Set(LIBRARY_CATEGORIES.map((category) => category.key));

  for (const article of LIBRARY_ARTICLES) {
    assert.ok(categoryKeys.has(article.category), `${article.slug} category must exist`);
    assert.ok(article.sections.length > 0, `${article.slug} must have at least one section`);

    const sectionIds = article.sections.map((section) => section.id);
    assert.deepEqual(sectionIds, uniqueValues(sectionIds), `${article.slug} section ids must be unique`);
  }
});

test('library related article slugs resolve unambiguously', () => {
  for (const article of LIBRARY_ARTICLES) {
    for (const relatedSlug of article.relatedArticleSlugs) {
      const matches = getArticleBySlug(relatedSlug);

      assert.equal(
        matches.length,
        1,
        `${article.slug} related slug must resolve to exactly one article: ${relatedSlug}`,
      );
    }
  }
});

test('library article CTA hrefs resolve to known public or library routes', () => {
  for (const article of LIBRARY_ARTICLES) {
    assertLibraryHrefExists(article.cta.href);
  }
});

test('library featured articles resolve in deterministic order', () => {
  const featuredArticles = getFeaturedLibraryArticles();

  assert.ok(featuredArticles.length > 0);
  assert.deepEqual(
    featuredArticles.map((article) => article.slug),
    [...LIBRARY_ARTICLES]
      .filter((article) => article.featured)
      .sort((left, right) => {
        return (
          (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.featuredOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.category.localeCompare(right.category) ||
          left.title.localeCompare(right.title) ||
          left.slug.localeCompare(right.slug)
        );
      })
      .map((article) => article.slug),
  );
});

test('library resolvers return safe values for invalid requests', () => {
  assert.equal(getLibraryCategory('missing-category'), null);
  assert.deepEqual(getArticlesByCategory('missing-category'), []);
  assert.equal(getLibraryArticle('flow-state', 'missing-article'), null);
});

test('library static params match registry content', () => {
  assert.deepEqual(
    getLibraryCategoryStaticParams(),
    LIBRARY_CATEGORIES.map((category) => ({ category: category.key })),
  );
  assert.deepEqual(
    getLibraryStaticParams(),
    LIBRARY_ARTICLES.map((article) => ({
      category: article.category,
      slug: article.slug,
    })),
  );
});

test('library article lists are deterministic and category-filtered', () => {
  assert.deepEqual(
    getLibraryArticles().map((article) => `${article.category}/${article.slug}`),
    [...LIBRARY_ARTICLES]
      .sort((left, right) => {
        return (
          left.category.localeCompare(right.category) ||
          left.title.localeCompare(right.title) ||
          left.slug.localeCompare(right.slug)
        );
      })
      .map((article) => `${article.category}/${article.slug}`),
  );

  assert.deepEqual(
    getArticlesByCategory('flow-state').map((article) => article.slug),
    ['what-is-flow-state'],
  );
});

test('library index view model renders every category with correct counts', () => {
  const viewModel = getLibraryIndexViewModel();

  assert.deepEqual(
    viewModel.categories.map((category) => category.href),
    getLibraryCategories().map((category) => getLibraryCategoryPath(category.key)),
  );

  for (const categoryCard of viewModel.categories) {
    const categoryKey = categoryCard.href.replace('/library/', '');
    const expectedCount = getArticlesByCategory(categoryKey).length;

    assert.equal(categoryCard.articleCount, expectedCount);
    assert.equal(
      categoryCard.articleCountLabel,
      expectedCount === 1 ? '1 article' : `${expectedCount} articles`,
    );
  }
});

test('library index view model generates article links from registry content', () => {
  const viewModel = getLibraryIndexViewModel();
  const knownArticleHrefs = new Set(LIBRARY_ARTICLES.map(getLibraryArticleHref));

  for (const article of [...viewModel.featuredArticles, ...viewModel.recommendedArticles]) {
    assert.ok(knownArticleHrefs.has(article.href), `article href must resolve: ${article.href}`);
    assert.match(article.readingTimeLabel, /^\d+ min read$/);
    assert.match(article.dateLabel, /^Updated \d{4}-\d{2}-\d{2}$/);
  }
});

test('library category view model includes only articles from the requested category', () => {
  const viewModel = getLibraryCategoryViewModel('behavioural-assessments');

  assert.ok(viewModel);
  assert.deepEqual(
    viewModel.articles.map((article) => article.href),
    getArticlesByCategory('behavioural-assessments').map(getLibraryArticleHref),
  );
  assert.ok(
    viewModel.articles.every((article) => article.categoryLabel === 'Behavioural assessments'),
  );
});

test('library category CTA uses assessment-specific and fallback routes', () => {
  const assessmentCategory = getLibraryCategory('behavioural-assessments');
  const fallbackCategory = getLibraryCategory('flow-state');

  assert.ok(assessmentCategory);
  assert.ok(fallbackCategory);
  assert.equal(getLibraryCategoryCta(assessmentCategory).href, '/sonartra-signals');
  assert.equal(getLibraryCategoryCta(fallbackCategory).href, '/contact');
});

test('library article detail view model builds rail items from article sections', () => {
  const article = getLibraryArticle('flow-state', 'what-is-flow-state');

  assert.ok(article);
  const viewModel = getLibraryArticleDetailViewModel(article);

  assert.deepEqual(
    viewModel.railItems.map((item) => item.id),
    article.sections.map((section) => section.id),
  );
  assert.deepEqual(
    viewModel.railItems.map((item) => item.href),
    article.sections.map((section) => `#${section.id}`),
  );
  assert.deepEqual(
    viewModel.sections.map((section) => section.href),
    article.sections.map((section) => `#${section.id}`),
  );
});

test('library article detail view model has unique section anchors and CTA metadata', () => {
  for (const article of LIBRARY_ARTICLES) {
    const viewModel = getLibraryArticleDetailViewModel(article);
    const sectionIds = viewModel.sections.map((section) => section.id);

    assert.deepEqual(sectionIds, uniqueValues(sectionIds));
    assert.equal(viewModel.cta.href, article.cta.href);
    assert.equal(viewModel.cta.label, article.cta.label);
    assert.ok(viewModel.keyTakeaways.length >= article.sections.length);
  }
});

test('library article detail view model resolves related reading cards', () => {
  const article = getLibraryArticle('flow-state', 'what-is-flow-state');

  assert.ok(article);
  const viewModel = getLibraryArticleDetailViewModel(article);

  assert.deepEqual(
    viewModel.relatedArticles.map((relatedArticle) => relatedArticle.href),
    article.relatedArticleSlugs.map((slug) => {
      const relatedArticle = getArticleBySlug(slug)[0];

      assert.ok(relatedArticle);
      return getLibraryArticleHref(relatedArticle);
    }),
  );
});

test('library article detail route renders through the canonical LibraryArticleShell', () => {
  const routeSource = readWorkspaceFile('app/(public)/library/[category]/[slug]/page.tsx');

  assert.match(routeSource, /LibraryArticleShell/);
  assert.doesNotMatch(routeSource, /article\.sections\.map/);
  assert.doesNotMatch(routeSource, /getRelatedLibraryArticles/);
});

test('library index metadata is generated with canonical and social fields', () => {
  const metadata = getLibraryIndexMetadata();

  assert.equal(metadata.title, 'Sonartra Library | Sonartra');
  assert.equal(
    metadata.description,
    'Clear explanations of the behavioural patterns, work styles and decision dynamics behind Sonartra assessments.',
  );
  assert.equal(String(metadata.alternates?.canonical), getLibraryIndexUrl());
  assert.equal(metadata.openGraph?.url, getLibraryIndexUrl());
  assert.equal(metadata.openGraph?.type, 'website');
  assert.equal(metadata.twitter?.card, 'summary_large_image');
});

test('library category metadata uses category registry data', () => {
  const category = getLibraryCategory('flow-state');
  const metadata = getLibraryCategoryMetadataByKey('flow-state');

  assert.ok(category);
  assert.ok(metadata);
  assert.equal(metadata.title, `${category.label} Library | Sonartra`);
  assert.equal(metadata.description, category.intro);
  assert.equal(String(metadata.alternates?.canonical), getLibraryCategoryUrl(category.key));
  assert.equal(metadata.openGraph?.url, getLibraryCategoryUrl(category.key));
});

test('library article metadata uses article registry data', () => {
  const article = getLibraryArticle('flow-state', 'what-is-flow-state');
  const metadata = getLibraryArticleMetadataByPath('flow-state', 'what-is-flow-state');

  assert.ok(article);
  assert.ok(metadata);
  assert.equal(metadata.title, `${article.title} | Sonartra`);
  assert.equal(metadata.description, article.description);
  assert.equal(String(metadata.alternates?.canonical), getLibraryArticleUrl(article));
  assert.equal(metadata.openGraph?.url, getLibraryArticleUrl(article));
  assert.equal(metadata.openGraph?.type, 'article');
  assert.equal(metadata.openGraph?.publishedTime, article.publishedAt);
  assert.equal(metadata.openGraph?.modifiedTime, article.updatedAt);
});

test('library metadata helpers return safe values for invalid category or article paths', () => {
  assert.equal(getLibraryCategoryMetadataByKey('missing-category'), null);
  assert.equal(getLibraryArticleMetadataByPath('flow-state', 'missing-article'), null);
  assert.equal(getLibraryArticleMetadataByPath('missing-category', 'what-is-flow-state'), null);
});

test('library canonical path builders generate stable category and article URLs', () => {
  const article = getLibraryArticle('flow-state', 'what-is-flow-state');

  assert.ok(article);
  assert.equal(getLibraryCategoryPath('flow-state'), '/library/flow-state');
  assert.equal(getLibraryArticlePath(article), '/library/flow-state/what-is-flow-state');
  assert.equal(getLibraryCategoryUrl('flow-state'), 'https://www.sonartra.com/library/flow-state');
  assert.equal(
    getLibraryArticleUrl(article),
    'https://www.sonartra.com/library/flow-state/what-is-flow-state',
  );
});

test('library sitemap includes index, every category, and every article without duplicates', () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  assert.ok(urls.includes(getLibraryIndexUrl()));

  for (const category of getLibraryCategories()) {
    assert.ok(urls.includes(getLibraryCategoryUrl(category.key)));
  }

  for (const article of getLibraryArticles()) {
    const entry = entries.find((candidate) => candidate.url === getLibraryArticleUrl(article));

    assert.ok(entry, `sitemap must include article ${article.slug}`);
    assert.equal(entry.lastModified, article.updatedAt);
  }

  assert.deepEqual(urls, uniqueValues(urls));
});

test('library article JSON-LD includes required article fields', () => {
  const article = getLibraryArticle('flow-state', 'what-is-flow-state');
  const category = getLibraryCategory('flow-state');

  assert.ok(article);
  assert.ok(category);

  const jsonLd = getLibraryArticleJsonLd(article, category);

  assert.equal(jsonLd['@context'], 'https://schema.org');
  assert.equal(jsonLd['@type'], 'Article');
  assert.equal(jsonLd.headline, article.title);
  assert.equal(jsonLd.description, article.description);
  assert.equal(jsonLd.datePublished, article.publishedAt);
  assert.equal(jsonLd.dateModified, article.updatedAt);
  assert.equal(jsonLd.articleSection, category.label);
  assert.deepEqual(jsonLd.mainEntityOfPage, {
    '@type': 'WebPage',
    '@id': getLibraryArticleUrl(article),
  });
});
