const schemasCollection = {
    userLoginSchema: require("./user.schema").userLoginSchema, // TODO: O se hace asi o se importa arriba y luego se exporta acá. Dependiendo la granularidad de cada schema file
};

export * from "./order.schema";

export default schemasCollection;
