import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getNameSeriesBySlug, getNames, getMeta, getGeo, getSimilarityNeighbors } from '$lib/static-api';

export const load: PageLoad = async ({ params, fetch }) => {
  const slug = params.slug;
  let series = null;
  let allNames = null;

  // Try to fetch the series directly by slug
  try {
    series = await getNameSeriesBySlug(slug, fetch);
  } catch {}

  // If not found, try to find the correct slug from all names
  if (!series) {
    allNames = await getNames(undefined, fetch);
    const match = allNames.find((entry) => entry.name.toLowerCase() === decodeURIComponent(slug).toLowerCase());
    if (match) {
      try {
        series = await getNameSeriesBySlug(match.slug, fetch);
      } catch {}
    }
  }

  if (!series) {
    throw error(404, 'Name not found.');
  }

  // Fetch additional data as before, using static-api helpers
  let meta, latestYear;
  try {
    meta = await getMeta(fetch);
    latestYear = Math.max(...meta.years);
  } catch {
    meta = { years: [] };
    latestYear = undefined;
  }

  let geoBoys = null, geoGirls = null, similarBoys = null, similarGirls = null, allNamesResult = null;
  try { geoBoys = await getGeo(latestYear, 'boys', fetch); } catch {}
  try { geoGirls = await getGeo(latestYear, 'girls', fetch); } catch {}
  try { similarBoys = await getSimilarityNeighbors('boys', series.slug, fetch); } catch {}
  try { similarGirls = await getSimilarityNeighbors('girls', series.slug, fetch); } catch {}
  try { allNamesResult = allNames ?? await getNames(undefined, fetch); } catch {}

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
