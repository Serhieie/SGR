const hre = require("hardhat");
const ethers = hre.ethers;
import "dotenv/config";

//sale
// 0x03429ebef8e1904b4b09dff0378ba0b4045caf49
//token
// 0x4a3c1a44927a7d0a606c4b8eba5a60effa3de1c8

async function main() {
  const tokenPriceInUsd = ethers.parseUnits("0.42", 18);
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, ethers.provider);
  const ethPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const sepoliaUsdt = "0x1531BC5dE10618c511349f8007C08966E45Ce8ef";
  // const [wallet] = await ethers.getSigners();
  const TokenSale = await ethers.getContractFactory("TokenSale", wallet);
  const shop = await TokenSale.deploy(ethPriceFeed, sepoliaUsdt, tokenPriceInUsd);
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
