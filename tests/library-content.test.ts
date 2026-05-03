import assert from 'node:assert/strict';
import test from 'node:test';

import { LIBRARY_ARTICLES } from '@/lib/library/articles';
import { LIBRARY_CATEGORIES } from '@/lib/library/categories';
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
