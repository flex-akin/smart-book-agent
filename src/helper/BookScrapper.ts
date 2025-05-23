import Logging from "../middleware/logging";
import puppeteer, { Browser, Page } from "puppeteer";
import OpenAI from "openai";
import { config } from "dotenv";
import Books from "../sequelize/books.model";
import Scrape from "../sequelize/scrape.model";
import { EScrapeStatus } from "../scrape/scrape.types";
config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface BookData {
  title: string;
  currentPrice: string;
  originalPrice: string;
  discount: string;
  sku: string;
  imageUrl: string;
  publisher: string;
  description: string;
  metadata: Record<string, string>;
  url: string;
  summary?: string;
  relevanceScore?: number;
  discountAmount?: number;
  discountPercentage?: number;
  valueScore?: number;
}

interface ScrapingOptions {
  headless?: boolean;
  timeout?: number;
  delay?: number;
  maxBooks?: number;
}

class BookScraper {
  private url: string;
  private options: ScrapingOptions;

  constructor(url: string, options: ScrapingOptions = {}) {
    this.url = url;
    this.options = {
      headless: true,
      timeout: 30000,
      delay: 1500,
      maxBooks: Infinity,
      ...options
    };
  }

  private getUrl(themeWord: string, numberOfPages: number): string {
    return `${this.url}/collections/${themeWord}/page/${numberOfPages}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async scrapeProductUrls(page: Page, collectionUrl: string): Promise<string[]> {
    Logging.info(`📄 Navigating to: ${collectionUrl}`);
    await page.goto(collectionUrl, {
      waitUntil: 'networkidle2',
      timeout: this.options.timeout
    });

    const productUrls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.woocommerce-loop-product__link'));
      return Array.from(new Set(links.map((link: Element) => (link as HTMLAnchorElement).href)));
    });

    Logging.info(`🔗 Found ${productUrls.length} product URLs`);
    return productUrls;
  }

  private async scrapeBookData(page: Page, bookUrl: string): Promise<BookData | null> {
    try {
      await page.goto(bookUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeout! / 1.5
      });
      await this.delay(this.options.delay!);

      const book = await page.evaluate(() => {
        const getText = (selector: string): string => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || "";
        };

        const getAttr = (selector: string, attr: string): string => {
          const element = document.querySelector(selector);
          return element?.getAttribute(attr) || "";
        };

        const title = getText(".product_title");
        const currentPrice = getText(".price .woocommerce-Price-amount");
        const originalPrice = getText(".price del .woocommerce-Price-amount");
        const sku = getText(".sku");
        const imageUrl = getAttr(".woocommerce-product-gallery__image img", "src");
        const description = document.querySelector(".woocommerce-tabs--description-content")?.textContent?.trim() || "";

        const rows = document.querySelectorAll(".short-description__content table tr");
        let publisher = "";
        const metadata: Record<string, string> = {};

        rows.forEach((row: Element) => {
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

      return book;
    } catch (error) {
      Logging.error(`❌ Failed to scrape ${bookUrl}:` + " " + (error as Error).message);
      return null;
    }
  }

  private async enrichWithAI(theme: string, book: BookData): Promise<BookData> {
    const summaryPrompt = `Summarize the following book description in 1–2 sentences:\n\n${book.description}`;
    const scorePrompt = `You are a helpful assistant. Based on the search theme and the book description provided, assign a relevance score between 0 and 100 (where 100 means extremely relevant and 0 means not relevant at all). Provide only a numeric score.\nSearch Theme: "${theme}"\nBook Description: "${book.description}"\nRelevance Score (0–100):`;

    try {
      const summaryRes = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You summarize book descriptions clearly and concisely." },
          { role: "user", content: summaryPrompt }
        ],
        temperature: 0.5,
        max_tokens: 100,
      });
      book.summary = summaryRes.choices[0].message.content?.trim() || "";
    } catch (err: any) {
      book.summary = "";
      Logging.error(`❌ AI Summary Error: ${err.message}`);
    }

    try {
      const scoreRes = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You assign numeric relevance scores based on thematic match." },
          { role: "user", content: scorePrompt }
        ],
        temperature: 0.0,
        max_tokens: 10,
      });
      const score = parseInt(scoreRes.choices[0].message.content?.trim() || "0", 10);
      book.relevanceScore = isNaN(score) ? 0 : score;
    } catch (err: any) {
      book.relevanceScore = 0;
      Logging.error(`❌ AI Score Error: ${err.message}`);
    }

    return book;
  }

  private performCostAnalysis(book: BookData): BookData {
    try {
      const current = parseFloat(book.currentPrice.replace(/[^0-9.]/g, ""));
      const original = parseFloat(book.originalPrice.replace(/[^0-9.]/g, "") || "0");

      if (original > 0 && current < original) {
        book.discountAmount = +(original - current).toFixed(2);
        book.discountPercentage = +(((original - current) / original) * 100).toFixed(2);
      } else {
        book.discountAmount = 0;
        book.discountPercentage = 0;
      }

      book.valueScore = +(book.relevanceScore! / current).toFixed(2);
    } catch (err: any) {
      Logging.error(`❌ Cost Analysis Error: ${err.message}`);
      book.discountAmount = 0;
      book.discountPercentage = 0;
      book.valueScore = 0;
    }
    return book;
  }

  private storeBooksWithJobId = async (books: BookData[], jobId: string) => {
    const records = books.map((book) => ({
      jobId,
      title: book.title,
      currentPrice: book.currentPrice,
      originalPrice: book.originalPrice,
      discount: book.discount,
      discountAmount: book.discountAmount,
      discountPercentage: book.discountPercentage,
      sku: book.sku,
      imageUrl: book.imageUrl,
      author: book.publisher,
      description: book.description,
      summary: book.summary,
      relevanceScore: book.relevanceScore,
      valueScore: book.valueScore,
      url: book.url,
    }));

    await Books.bulkCreate(records);
    await Scrape.update({
      status: EScrapeStatus.COMPLETED
    }, {
      where: {
        id: jobId
      }
    })

  }


  async scrapeBooks(themeWord: string, pageNumber: number = 1, jobId: string): Promise<BookData[]> {
    let browser: Browser | null = null;

    try {
      Logging.info('🚀 Starting book scraping...');

      browser = await puppeteer.launch({
        headless: this.options.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      const collectionUrl = this.getUrl(themeWord, pageNumber);
      const productUrls = await this.scrapeProductUrls(page, collectionUrl);
      if (productUrls.length === 0) return [];

      const urlsToScrape = this.options.maxBooks ? productUrls.slice(0, this.options.maxBooks) : productUrls;

      const books: BookData[] = [];
      for (let i = 0; i < urlsToScrape.length; i++) {
        const url = urlsToScrape[i];
        const book = await this.scrapeBookData(page, url);
        if (book) {
          const enriched = await this.enrichWithAI(themeWord, book);
          const analyzed = this.performCostAnalysis(enriched);
          books.push(analyzed);
        }
        if (i < urlsToScrape.length - 1) await this.delay(this.options.delay!);
      }

      Logging.info(`🎉 Scraping completed! Found ${books.length} books.`);
      this.storeBooksWithJobId(books, jobId)
      return books;

    } catch (error) {
      Logging.error('💥 Scraping failed:' + " " + (error as Error).message);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }
}

export default BookScraper;
