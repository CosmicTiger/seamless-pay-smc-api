import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Greeter", (m) => {
    const initial = m.getParameter("initial", "Hello, world!");
    const greeter = m.contract("Greeter", [initial]);
    return { greeter };
});
