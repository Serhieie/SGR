const hre = require("hardhat");
const ethers = hre.ethers;
import "dotenv/config";

// npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
// npx hardhat run scripts/deploy.js --network localhost

//sale
// 0xEE8DA8f1Ab01FcB2880315d6fF1192f95C978dA4
//token
// 0x38C15b113cE4A0e0ba01FEBF6929B3229a42C398

async function main() {
  // const privateKey = process.env.PRIVATE_KEY;
  // const wallet = new ethers.Wallet(privateKey, ethers.provider);
  const [wallet] = await ethers.getSigners();
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
