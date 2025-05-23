export interface ResponseInterface {
    message: string;
    status: boolean;
    data?: any;
}

export interface ErrorInterface extends ResponseInterface {
    stack?: string;
}
