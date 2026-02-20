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


  // Fetch additional data as before, using static-api helpers
  const meta = await import('$lib/static-api').then(m => m.getMeta());
  const latestYear = Math.max(...meta.years);
  const staticApi = await import('$lib/static-api');
  const [geoBoys, geoGirls, similarBoys, similarGirls, allNamesResult] = await Promise.all([
    staticApi.getGeo(latestYear, 'boys'),
    staticApi.getGeo(latestYear, 'girls'),
    staticApi.getSimilarityNeighbors('boys', series.slug),
    staticApi.getSimilarityNeighbors('girls', series.slug),
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
