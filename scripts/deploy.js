const hre = require("hardhat");
const ethers = hre.ethers;

// npx hardhat run scripts/deploy.js --network localhost

async function main() {
  const [signer] = await ethers.getSigners();

  const TokenSale = await ethers.getContractFactory("TokenSale", signer);
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
