import { loadFixture, ethers, expect } from "./setup";
import { SolarGreen } from "../typechain-types/contracts/SolarGreen";

describe("SolarGreen", function () {
  async function deploy() {
    const [owner, buyer1, buyer2, shop] = await ethers.getSigners();
    const TokenFactory = await ethers.getContractFactory("SolarGreen", owner);
    const token: SolarGreen = await TokenFactory.deploy(owner.address, shop.address);
    await token.waitForDeployment();

    return { owner, buyer1, buyer2, token, shop };
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
    const { owner, token, shop } = await loadFixture(deploy);
    const initialBalance = await token.balanceOf(shop.address);
    const amountToBurn = ethers.parseEther("100");
    await token.connect(owner).burnTokensFrom(shop.address, amountToBurn);
    expect(await token.balanceOf(shop.address)).to.equal(initialBalance - amountToBurn);
  });

  it("Should preventd to burn tokens if amountForBurning bigger than balance", async function () {
    const { shop, token } = await loadFixture(deploy);
    const initialTokenBalance = await token.balanceOf(shop.address);
    const amountToBurn = initialTokenBalance + BigInt(1);
    await expect(token.burnTokensFrom(shop.address, amountToBurn)).to.be.revertedWith(
      "Burning more than possible"
    );
    expect(await token.balanceOf(shop.address)).to.equal(initialTokenBalance);
  });

  it("allow owner add and remove role BLACKLISTER ", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    const blacklisterRole = await token.BLACKLISTER();
    await token.connect(owner).grantBlRole(buyer1.address);
    expect(await token.hasRole(blacklisterRole, buyer1.address)).to.equal(true);
    await token.connect(owner).revokeBlRole(buyer1.address);
    expect(await token.hasRole(blacklisterRole, buyer1.address)).to.equal(false);
  });

  it("should not allow add to bl BLACKLISTERs ", async function () {
    const { owner, token, buyer1, buyer2 } = await loadFixture(deploy);
    const blacklisterRole = await token.BLACKLISTER();
    await token.connect(owner).grantBlRole(buyer1.address);
    await token.connect(owner).grantBlRole(buyer2.address);
    await expect(token.connect(buyer1).addToBlacklist(buyer2.address)).to.be.revertedWith(
      "SolarGreen: Cannot add another blacklister to bl"
    );
  });

  it("should allow add and remove from bl", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    await token.connect(owner).addToBlacklist(buyer1);
    expect(await token.connect(owner).isBlackListed(buyer1)).to.equal(true);
    await token.connect(owner).removeFromBlacklist(buyer1);
    expect(await token.connect(owner).isBlackListed(buyer1)).to.equal(false);
  });
});
