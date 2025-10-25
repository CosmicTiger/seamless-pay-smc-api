import App from "./app";
import appConfig from "./core/config/app.config";
import { AuthController, SmartContractsController } from "./controllers";
import { SmartContractsService } from "./services";

const app = new App(
    [
        new AuthController(),
        // new SmartContractsController(new SmartContractsService()), TODO: Enable when ready
    ],
    appConfig.port
);

app.listen();
