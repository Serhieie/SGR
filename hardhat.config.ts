import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

const PRIVATE_KEY_1 = process.env.PRIVATE_KEY;
const PROJECT = process.env.PROJECT_ID;

if (!PRIVATE_KEY_1) {
  throw new Error("PRIVATE_KEY_1 is not defined in the environment variables.");
}

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${PROJECT}`,
      chainId: 11155111,
      accounts: [PRIVATE_KEY_1],
    },
  },
};

export default config;
