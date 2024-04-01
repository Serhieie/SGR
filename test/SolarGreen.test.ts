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

  it("allow owner add and remove role BLACKLISTER ", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    const blacklisterRole = await token.BLACKLISTER();
    await token.connect(owner).grantBlRole(blacklisterRole, buyer1.address);
    expect(await token.hasRole(blacklisterRole, buyer1.address)).to.equal(true);
    await token.connect(owner).revokeBlRole(blacklisterRole, buyer1.address);
    expect(await token.hasRole(blacklisterRole, buyer1.address)).to.equal(false);
  });

  it("should not allow add to bl BLACKLISTERs ", async function () {
    const { owner, token, buyer1, buyer2 } = await loadFixture(deploy);
    const blacklisterRole = await token.BLACKLISTER();
    await token.connect(owner).grantBlRole(blacklisterRole, buyer1.address);
    await token.connect(owner).grantBlRole(blacklisterRole, buyer2.address);
    await expect(token.connect(buyer1).addToBlacklist(buyer2.address)).to.be.revertedWith(
      "SolarGreen: Cannot add another blacklister to blacklist"
    );
  });

  it("should allow add and remove from bl", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    await token.connect(owner).addToBlacklist(buyer1);
    expect(await token.connect(owner).isBlackListed(buyer1)).to.equal(true);
    await token.connect(owner).removeFromBlacklist(buyer1);
    expect(await token.connect(owner).isBlackListed(buyer1)).to.equal(false);
  });

  // const date1 = new Date("2024-03-14T16:59:59Z");
  // const timestamp1 = date1.getTime() / 1000;
  // console.log(timestamp1);

  // const date2 = new Date("2024-12-31T23:59:59Z");
  // const timestamp2 = date2.getTime() / 1000;
  // console.log(timestamp2);
});
