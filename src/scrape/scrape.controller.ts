import Scrapper from "../global/EventEmiter";
import Scrape from "../sequelize/scrape.model";
import { Body, Get, Path, Post, Route, Tags } from "tsoa";
import { EScrapeStatus } from "./scrape.types";
import Books from "../sequelize/books.model";


@Tags('Scrape')
@Route('api/v1/scrape')
export default class ScrapeController {

    @Post('/')
    async scrape(
        @Body() reqBody: {
            themeWord: string
        },
    ) {

        const data = await Scrape.create({
            status: EScrapeStatus.PENDING
        })
        Scrapper.emitScrape(reqBody.themeWord, 2, data.id);
        return {
            message: "Your request is pending",
            status: true,
            statusCode: 201,
            data: {
                jobId: data.id,
                status: data.status
            },
        };
    }

    @Get('/status/{jobId}')
    async getStatus(
        @Path() jobId: string
    ) {
        const data = await Scrape.findByPk(jobId) as any
        if (!data) {
            return {
                message: `invalid job id`,
                status: false,
                statusCode: 400,
                data: null
            };
        }
        return {
            message: `Your request is ${data.status}`,
            status: true,
            statusCode: 201,
            data: {
                jobId: data.id,
                status: data.status
            },
        };
    }

    @Get('/results/{jobId}')
    async getBooks(
        @Path() jobId: string
    ) {
        const data = await Books.findAll({
            where: {
                jobId
            }
        }) as any
        if (data.length === 0 || !data) {
            return {
                message: `invalid job id or is still pending`,
                status: true,
                statusCode: 400,
                data: null
            };
        }
        return {
            message: `data fetched successfully}`,
            status: true,
            statusCode: 201,
            data
        };
    }
}