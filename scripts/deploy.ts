const hre = require("hardhat");
const ethers = hre.ethers;
import "dotenv/config";

//sale
// 0x9ebed8a606461829e3453c23b73a1c7152f9db49
//token
// 0xe697650af5f8f064c0d9f8d697cc219855bb9d71

async function main() {
  const tokenPriceInUsd = ethers.parseUnits("0.42", 18);
  const privateKey = process.env.PRIVATE_KEY;

  const tokenOwner = "0x62DDa5dB10849aDF9faa3C6F9E6aa15D22d2Eb8a";
  const wallet = new ethers.Wallet(privateKey, ethers.provider);
  const ethPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const sepoliaUsdt = "0x1531BC5dE10618c511349f8007C08966E45Ce8ef";

  const TokenSale = await ethers.getContractFactory("TokenSale", wallet);
  const shop = await TokenSale.deploy(
    tokenOwner,
    ethPriceFeed,
    sepoliaUsdt,
    tokenPriceInUsd
  );

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
