import express, { Request, Response, NextFunction, Application } from 'express';
import { Server } from 'http';
import { config } from 'dotenv';
import cors from 'cors';
import http from 'http';
import { errorResponse, notFound } from './middleware/errorHandler';
import Logging from './middleware/logging';
import { ResponseInterface } from './global/interface.global';
import scrapeRoute from './scrape/scrape.route';
import Scrapper from './global/EventEmiter';
import sequelize from './sequelize/connection';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import bodyParser from 'body-parser';

const app: Application = express();
const httpServer = http.createServer(app);
app.use(cors());
config();

app.use((req, res, next) => {
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

Scrapper.on('emitScrape', (themeWord: string, numberOfPages: number, jobId: string) => {
    Scrapper.Scrape(themeWord, numberOfPages, jobId);
});


app.get(
    '/health-status',
    async (req: Request, res: Response<ResponseInterface>) => {
        res.status(200).send({
            message: '🚀  server is up and running',
            status: true,
        });
    },
);
app.use(express.static(path.join(__dirname, '../public')));
app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, { swaggerOptions: { url: '/swagger.json' } }),
);
app.use('/api/v1/scrape', scrapeRoute);

app.use(notFound);
app.use(errorResponse);

const PORT: number = Number(process.env.PORT) || 3000;

sequelize
    .sync
    (
        {
            alter: true,
        }
    )

    .then(() => {
        console.log('Database connected successfully');
        const server: Server = app.listen(PORT, () => {
            Logging.info(`🚀  App is running on port ${PORT}`);
        });
    })
    .catch((error: any) => {
        Logging.error('Unable to connect to the database:' + error);
    });


