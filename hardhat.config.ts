import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const { ETHERSCAN_API_KEY, MAINNET_RPC_URL, SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.24",

  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },

  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL ? SEPOLIA_RPC_URL : "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
