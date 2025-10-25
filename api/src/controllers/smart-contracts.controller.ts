import { type Request, type Response, type NextFunction } from "express";
import BaseController from "./base.controller";
import { StatusCodes } from "http-status-codes";
import type SmartContractsService from "../services/smart-contracts.service";

class SmartContractsController extends BaseController {
    private smartContractsService: SmartContractsService;

    constructor(smartContractsService: SmartContractsService) {
        super("/smart-contracts");
        this.smartContractsService = smartContractsService;
    }

    protected initializeRoutes() {
        this.router.get(`${this.path}/greeter/greeting`, this.greeting);
    }

    private async greeting(req: Request, res: Response, next: NextFunction) {
        try {
            const greeting = await this.smartContractsService.getContractData(
                "Greeter"
            );
            res.status(StatusCodes.OK).json(greeting);
        } catch (error) {
            next(error);
        }
    }
}

export default SmartContractsController;
