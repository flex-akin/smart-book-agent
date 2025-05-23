const puppeteer = require('puppeteer');
const fs = require('fs');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  await page.goto('https://bookdp.com.au/collections/biographies-memoirs/page/2', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

const productUrls = await page.evaluate(() => 
  Array.from(new Set(
    Array.from(document.querySelectorAll('.woocommerce-loop-product__link')).map(link => link.href)
  ))
);

  const books = [];
  for (const url of productUrls.slice(0, productUrls.length)) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await delay(1500);
      const book = await page.evaluate(() => {
        const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || "";
        const getAttr = (selector, attr) => document.querySelector(selector)?.getAttribute(attr) || "";
        const title = getText(".product_title");
        const currentPrice = getText(".price .woocommerce-Price-amount");
        const originalPrice = getText(".price del .woocommerce-Price-amount");
        const sku = getText(".sku");
        const imageUrl = getAttr(".woocommerce-product-gallery__image img", "src");
        const description = document.querySelector(".woocommerce-tabs--description-content")?.textContent?.trim() || "";
        const rows = document.querySelectorAll(".short-description__content table tr");
        let publisher = "";
        const metadata = {};
        rows.forEach(row => {
          const th = row.querySelector("th")?.textContent?.trim();
          const td = row.querySelector("td")?.textContent?.trim();
          if (th && td) {
            metadata[th] = td;
            if (th.toLowerCase().includes("publisher")) {
              publisher = td;
            }
          }
        });
        let discount = "";
        if (originalPrice && currentPrice) {
          const original = parseFloat(originalPrice.replace(/[^0-9.]/g, ""));
          const current = parseFloat(currentPrice.replace(/[^0-9.]/g, ""));
          if (original > 0 && current < original) {
            const discountPercentage = Math.round(((original - current) / original) * 100);
            discount = `${discountPercentage}%`;
          }
        }

        return {
          title,
          currentPrice,
          originalPrice,
          discount,
          sku,
          imageUrl,
          publisher,
          description,
          metadata,
          url: window.location.href,
        };
      });

      books.push(book);
      console.log(`✅ Scraped: ${book.title}`);

    } catch (err) {
      console.error(`❌ Failed on ${url}:`, err.message);
    }
  }
  await browser.close();
})();
