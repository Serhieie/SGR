import { loadFixture, ethers, expect } from "./setup";
import { SolarGreen } from "../typechain-types/contracts/SolarGreen";

describe("SolarGreen", function () {
  async function deploy() {
    const [owner, buyer1, buyer2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("SolarGreen", owner);
    const token: SolarGreen = await Token.deploy(owner.address);
    await token.waitForDeployment();

    return { owner, buyer1, buyer2, token };
  }

  it("should deploy with initial supply", async function () {
    const { token } = await loadFixture(deploy);
    const expectedSupply = ethers.parseEther("100000000");
    expect(await token.totalSupply()).to.equal(expectedSupply);
  });

  it("should allow mint tokens", async function () {
    const { owner, buyer1, token } = await loadFixture(deploy);
    const amountToMint = ethers.parseEther("1000000");
    await token.connect(owner).mint(buyer1.address, amountToMint);
    expect(await token.balanceOf(buyer1.address)).to.equal(amountToMint);
  });

  it("should allow burn tokens", async function () {
    const { owner, token } = await loadFixture(deploy);
    const amountToBurn = ethers.parseEther("100");
    const currentSupply = (await token.balanceOf(owner.address)) - amountToBurn;
    await token.connect(owner)["burn(address,uint256)"](owner.address, amountToBurn);
    expect(await token.balanceOf(owner.address)).to.equal(currentSupply);
  });

  it("should allow add to bl", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    await token.connect(owner).addToBlacklist(buyer1);
    expect(await token.connect(owner).isBlackListed(buyer1)).to.equal(true);
  });

  it("should allow remove from bl", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    await token.connect(owner).addToBlacklist(buyer1);
    await token.connect(owner).removeFromBlacklist(buyer1);
    expect(await token.connect(owner).isBlackListed(buyer1)).to.equal(false);
  });
});
