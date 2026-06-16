import { gotScraping } from "got-scraping";
import * as cheerio from "cheerio";

async function run() {
  const response = await gotScraping({
    url: 'https://www.pib.gov.in/allRel.aspx?reg=48&lang=1',
    headerGeneratorOptions: { browsers: [{ name: 'chrome' }] }
  });
  const $ = cheerio.load(response.body);
  const links = [];
  $('ul li a, .content-area a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('PressReleasePage.aspx')) {
      links.push({
        title: $(el).text().trim(),
        link: href.startsWith('http') ? href : 'https://pib.gov.in/' + href.replace(/^\//, '')
      });
    }
  });
  console.log(links.slice(0, 5));
}
run();
