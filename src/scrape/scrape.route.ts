import express, { Request, Response, Router } from 'express';
import ScrapeController from './scrape.controller';


const scrapeRoute: Router = express.Router();

scrapeRoute.post(
    '/',
    async (req: Request<{}, {}>, res: Response<any>): Promise<any> => {
        const scrapeService = new ScrapeController();
        const data = await scrapeService.scrape(req.body)
        const { statusCode, ...responseData } = data;
        return res.status(statusCode).send({ ...responseData });
    }
);

scrapeRoute.get(
    '/results/:jobId',
    async (req: Request<{jobId: string }, {}>, res: Response<any>): Promise<any> => {
        const scrapeService = new ScrapeController();
        const data = await scrapeService.getBooks(req.params.jobId)
        const { statusCode, ...responseData } = data;
        return res.status(statusCode).send({ ...responseData });
    }
);

scrapeRoute.get(
    '/status/:jobId',
    async (req: Request<{jobId: string }, {}>, res: Response<any>): Promise<any> => {
        const scrapeService = new ScrapeController();
        const data = await scrapeService.getStatus(req.params.jobId)
        const { statusCode, ...responseData } = data;
        return res.status(statusCode).send({ ...responseData });
    }
);


export default scrapeRoute;