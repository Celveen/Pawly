import { ARTICLES, ARTICLE_CATS } from '../components/data';
import { PET_SPECIES } from '../lib/pet-species';

const targetTotal = 20;
const articles = ARTICLES as Array<{ cat?: string; species?: string[]; title?: string; excerpt?: string }>;
const categoryCounts = new Map(ARTICLE_CATS.filter((item) => item.id !== 'all').map((item) => [item.id, 0]));
const speciesCounts = new Map(PET_SPECIES.map((item) => [item.id, 0]));

for (const article of articles) {
  if (article.cat && categoryCounts.has(article.cat)) categoryCounts.set(article.cat, (categoryCounts.get(article.cat) || 0) + 1);
  const text = `${article.title || ''} ${article.excerpt || ''}`;
  for (const pet of PET_SPECIES) {
    const matched = article.species?.includes(pet.id) || pet.aliases.some((alias) => text.includes(alias));
    if (matched) speciesCounts.set(pet.id, (speciesCounts.get(pet.id) || 0) + 1);
  }
}

console.log(`Total articles: ${articles.length} / target ${targetTotal}`);
for (const item of ARTICLE_CATS.filter((item) => item.id !== 'all')) console.log(`category ${item.name}: ${categoryCounts.get(item.id) || 0}`);
for (const pet of PET_SPECIES) console.log(`species ${pet.label}: ${speciesCounts.get(pet.id) || 0}`);

const missingCategories = Array.from(categoryCounts).filter(([, count]) => count === 0).map(([id]) => id);
const missingSpecies = Array.from(speciesCounts).filter(([, count]) => count === 0).map(([id]) => id);
if (articles.length < targetTotal || missingCategories.length || missingSpecies.length) {
  console.error(`Coverage incomplete: categories=${missingCategories.join(',') || 'none'} species=${missingSpecies.join(',') || 'none'}`);
  process.exit(1);
}
