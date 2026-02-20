import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getNameSeriesBySlug, getNames } from '$lib/static-api';

export const load: PageLoad = async ({ params }) => {
  const slug = params.slug;
  let series = null;
  let allNames = null;

  // Try to fetch the series directly by slug
  try {
    series = await getNameSeriesBySlug(slug);
  } catch {}

  // If not found, try to find the correct slug from all names
  if (!series) {
    allNames = await getNames();
    const match = allNames.find((entry) => entry.name.toLowerCase() === decodeURIComponent(slug).toLowerCase());
    if (match) {
      try {
        series = await getNameSeriesBySlug(match.slug);
      } catch {}
    }
  }

  if (!series) {
    throw error(404, 'Name not found.');
  }

  // Fetch additional data as before, using static files
  const meta = await fetch('/api/meta.json').then((res) => res.json());
  const latestYear = Math.max(...meta.years);
  const [geoBoys, geoGirls, similarBoys, similarGirls, allNamesResult] = await Promise.all([
    fetch(`/api/geo/${latestYear}/boys.json`).then((res) => res.json()),
    fetch(`/api/geo/${latestYear}/girls.json`).then((res) => res.json()),
    fetch(`/api/similar/boys/${series.slug}.json`).then((res) => res.json()),
    fetch(`/api/similar/girls/${series.slug}.json`).then((res) => res.json()),
    allNames ?? getNames()
  ]);

  return {
    latestYear,
    series,
    geoBoys,
    geoGirls,
    similarBoys,
    similarGirls,
    allNames: allNames ?? allNamesResult
  };
};
