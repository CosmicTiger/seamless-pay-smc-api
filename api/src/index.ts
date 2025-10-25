import App from "./app";
import appConfig from "./core/config/app.config";

const app = new App([], appConfig.port);

app.listen();
