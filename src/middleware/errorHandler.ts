import createHttpError from "http-errors";
import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ErrorInterface } from "../global/interface.global";

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
};

export const errorResponse: ErrorRequestHandler = (
  err,
  req: Request,
  res: Response<ErrorInterface>,
  next: NextFunction,
) => {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    stack: err.stack,
    status: false,
  });
};
