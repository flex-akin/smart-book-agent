import { EventEmitter } from 'events';
import BookScraper from '../../helper/BookScrapper';

class Scrapper extends EventEmitter {
    emitScrape(themeWord: string, numberOfPages: number, jobId: string) {
        this.emit('emitScrape', themeWord, numberOfPages, jobId );
    }
    async Scrape(themeWord: string, numberOfPages: number, jobId: string) {
        try {
            const scrapper = new BookScraper("https://bookdp.com.au/")
            const books = await scrapper.scrapeBooks(themeWord, numberOfPages, jobId);
        } catch (error) {
            console.log(error)
        }
    }
}

export default new Scrapper();
