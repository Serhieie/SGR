const hre = require("hardhat");
const ethers = hre.ethers;
import "dotenv/config";

// npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
// npx hardhat run scripts/deploy.js --network localhost

//sale
// 0xdf74c6c855a1a2826348c3fcd699583196f1f130
//token
// 0x244f171ecb6bb6ab4a57042a5e4a1e75a9dc7e77

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, ethers.provider);
  // const [wallet] = await ethers.getSigners();
  const TokenSale = await ethers.getContractFactory("TokenSale", wallet);
  const shop = await TokenSale.deploy();
  await shop.waitForDeployment();
  console.log(await shop.target);
  console.log(await shop.token());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
