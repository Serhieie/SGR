import { loadFixture, ethers, expect } from "./setup";
import { SolarGreen } from "../typechain-types/contracts/SolarGreen";

describe("SolarGreen", function () {
  async function deploy() {
    const [owner, buyer1, buyer2, shop, shopOwner] = await ethers.getSigners();
    const TokenFactory = await ethers.getContractFactory("SolarGreen", owner);
    const token: SolarGreen = await TokenFactory.deploy(
      shopOwner.address,
      owner.address,
      shop.address
    );
    await token.waitForDeployment();

    return { owner, buyer1, buyer2, token, shop, shopOwner };
  }

  it("Owner must not be propper address", async function () {
    const { token, owner } = await loadFixture(deploy);
    expect(await token.owner()).to.equal(owner.address).to.be.properAddress;
  });

  it("should set initial roles correct", async function () {
    const { owner, token, shopOwner } = await loadFixture(deploy);
    const admin = await token.DEFAULT_ADMIN_ROLE();
    const blacklister = await token.BLACKLISTER();
    expect(await token.hasRole(admin, owner.address)).to.be.true;
    expect(await token.hasRole(blacklister, owner.address)).to.be.true;
    expect(await token.hasRole(blacklister, shopOwner.address)).to.be.true;
  });

  it("should deploy with initial supply", async function () {
    const { token } = await loadFixture(deploy);
    const expectedSupply = ethers.parseEther("100000000");
    expect(await token.totalSupply()).to.equal(expectedSupply);
  });

  it("should allow mint tokens", async function () {
    const { owner, buyer1, token } = await loadFixture(deploy);
    const amountToMint = ethers.parseEther("1000000");
    await token.connect(owner).mint(buyer1.address, amountToMint);
    expect(await token.balanceOf(buyer1.address))
      .to.equal(amountToMint)
      .to.emit(token, "SuccessMint");
  });

  it("should allow burn tokens", async function () {
    const { owner, token, shop } = await loadFixture(deploy);
    const initialBalance = await token.balanceOf(shop.address);
    const amountToBurn = ethers.parseEther("100");
    await token.connect(owner).burnTokensFrom(shop.address, amountToBurn);
    expect(await token.balanceOf(shop.address))
      .to.equal(initialBalance - amountToBurn)
      .to.emit(token, "SuccessBurn");
  });

  it("should not allow mint tokens regular addresses", async function () {
    const { buyer1, token } = await loadFixture(deploy);
    const initialTokenBalance = await token.balanceOf(buyer1.address);
    const amountToMint = ethers.parseEther("1000000");
    await expect(token.connect(buyer1).mint(buyer1.address, amountToMint)).to.be.reverted;
    expect(await token.balanceOf(buyer1.address)).to.equal(initialTokenBalance);
  });

  it("should not allow burn tokens regular addresses", async function () {
    const { buyer1, token, shop } = await loadFixture(deploy);
    const initialTokenBalance = await token.balanceOf(shop.address);
    const amountToBurn = ethers.parseEther("100");
    await expect(token.connect(buyer1).burnTokensFrom(shop.address, amountToBurn)).to.be
      .reverted;
    expect(await token.balanceOf(shop.address)).to.equal(initialTokenBalance);
  });

  it("Should preventd to burn tokens if amountForBurning bigger than balance", async function () {
    const { shop, token } = await loadFixture(deploy);
    const initialTokenBalance = await token.balanceOf(shop.address);
    const amountToBurn = initialTokenBalance + BigInt(1);
    await expect(token.burnTokensFrom(shop.address, amountToBurn)).to.be.revertedWith(
      "SolarGreen: You trying to Burn more tokens than possible"
    );
    expect(await token.balanceOf(shop.address)).to.equal(initialTokenBalance);
  });

  it("should allow use  transferFrom & approve", async function () {
    const { buyer1, buyer2, token, owner } = await loadFixture(deploy);
    const amountToMint = ethers.parseEther("100");
    await token.mint(buyer1.address, amountToMint);
    await token.connect(buyer1).approve(buyer2.address, amountToMint);
    const initialTokenBalance = await token.balanceOf(buyer1.address);
    await token
      .connect(buyer2)
      .transferFrom(buyer1.address, buyer2.address, amountToMint);
    expect(await token.balanceOf(buyer2.address)).to.equal(initialTokenBalance);
    expect(await token.balanceOf(buyer1.address)).to.equal(0);
  });

  it("should allow transfer tokens", async function () {
    const { buyer1, token, owner } = await loadFixture(deploy);
    const amountToMint = ethers.parseEther("1");
    await token.mint(owner.address, amountToMint);
    await token.transfer(buyer1.address, amountToMint);
    expect(await token.balanceOf(owner.address)).to.equal(0);
    expect(await token.balanceOf(buyer1.address)).to.equal(amountToMint);
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
    await token.connect(owner).grantBlRole(buyer1.address);
    await token.connect(owner).grantBlRole(buyer2.address);
    await expect(token.connect(buyer1).addToBlacklist(buyer2.address)).to.be.revertedWith(
      "SolarGreen: Cannot add another blacklister to blacklist"
    );
  });

  it("should not allow blacklister to grand roles", async function () {
    const { owner, token, buyer1, buyer2 } = await loadFixture(deploy);
    await token.connect(owner).grantBlRole(buyer1.address);
    await expect(token.connect(buyer1).grantBlRole(buyer2.address)).to.be.reverted;
  });

  it("should not allow blacklister to mint", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    await token.connect(owner).grantBlRole(buyer1.address);
    const initialTokenBalance = await token.balanceOf(buyer1.address);
    const amountToMint = ethers.parseEther("1000000");
    await expect(token.connect(buyer1).mint(buyer1.address, amountToMint)).to.be.reverted;
    expect(await token.balanceOf(buyer1.address)).to.equal(initialTokenBalance);
  });

  it("should not allow blacklister to burn", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    await token.connect(owner).grantBlRole(buyer1.address);
    const initialTokenBalance = await token.balanceOf(buyer1.address);
    const amountToMint = ethers.parseEther("1000000");
    await expect(token.connect(buyer1).burnTokensFrom(buyer1.address, amountToMint)).to.be
      .reverted;
    expect(await token.balanceOf(buyer1.address)).to.equal(initialTokenBalance);
  });

  it("Blacklister should not allow add to bl owner ", async function () {
    const { owner, token, buyer1, buyer2 } = await loadFixture(deploy);
    await token.connect(owner).grantBlRole(buyer1.address);
    await expect(token.connect(buyer1).addToBlacklist(owner.address)).to.be.revertedWith(
      "SolarGreen: Cant do this with admin"
    );
  });

  it("should allow add and remove from bl", async function () {
    const { owner, token, buyer1 } = await loadFixture(deploy);
    await token.connect(owner).addToBlacklist(buyer1);
    expect(await token.connect(owner).isBlackListed(buyer1))
      .to.equal(true)
      .to.emit(token, "AddedToBlacklist");
    await token.connect(owner).removeFromBlacklist(buyer1);
    expect(await token.connect(owner).isBlackListed(buyer1))
      .to.equal(false)
      .to.emit(token, "RemovedFromBlacklist");
  });

  it("should not allow add and remove from bl from regular addresses", async function () {
    const { owner, token, buyer1, buyer2 } = await loadFixture(deploy);
    await expect(token.connect(buyer2).addToBlacklist(buyer1)).to.be.reverted;
    expect(await token.isBlackListed(buyer1)).to.equal(false);
    await token.connect(owner).addToBlacklist(buyer1);
    await expect(token.connect(buyer2).removeFromBlacklist(buyer1)).to.be.reverted;
    expect(await token.isBlackListed(buyer1)).to.equal(true);
  });
});
