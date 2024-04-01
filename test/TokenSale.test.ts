import { loadFixture, ethers, expect } from "./setup";
import { TokenSale } from "../typechain-types/contracts/TokenSale";
import { UsdtForTest } from "../typechain-types/contracts/UsdtForTest";

describe("TokenSale", function () {
  async function deploy() {
    const [owner, buyer1, buyer2] = await ethers.getSigners();
    const TShopFactory = await ethers.getContractFactory("TokenSale", owner);
    const shop: TokenSale = await TShopFactory.deploy();
    await shop.waitForDeployment();
    const UsdtFactroy = await ethers.getContractFactory("UsdtForTest", owner);
    const usdt: UsdtForTest = await UsdtFactroy.deploy(owner);
    await usdt.waitForDeployment();
    return { owner, buyer1, buyer2, shop, usdt };
  }

  describe("Deployment", function () {
    it("Should set the owner as the deployer", async function () {
      const { owner, shop } = await loadFixture(deploy);
      expect(await shop.owner()).to.equal(owner.address);
    });
  });
  2;
  describe("Functionality", function () {
    it("Should allow buying tokens with uUSDT", async function () {
      const { buyer1, shop, usdt, owner } = await loadFixture(deploy);
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalance();
      const priceEthInUsd = await shop.priceEthInUSD();
      const tokensToBuy =
        (BigInt(usdtForSend) * BigInt(10 ** 18)) /
        (priceEthInUsd * BigInt(100000000000000));

      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);
      const tx = await shop.connect(buyer1).convertUsdToTokens(usdtForSend);
      await usdt.connect(buyer1).transfer(shop.target, usdtForSend);
      await tx.wait();

      expect(await usdt.balanceOf(buyer1.address)).to.equal(0);
      expect(await usdt.balanceOf(shop.target)).to.equal(usdtForSend);
      expect(await shop.tokenBalanceOf(buyer1.address)).to.equal(tokensToBuy);
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance - tokensToBuy);
      await expect(tx)
        .to.emit(shop, "TokensBought")
        .withArgs(buyer1.address, tokensToBuy);
    });

    it("Should prevent buying tokens with uUSDT if listing is not active", async function () {
      const { buyer1, shop, usdt, owner } = await loadFixture(deploy);
      await shop.updateSaleDuration(0);
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalance();

      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("Sale is not active");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if user in black list", async function () {
      const { buyer1, shop, usdt, owner } = await loadFixture(deploy);
      await shop.addAccToBlacklist(buyer1.address);
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalance();

      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("Sender is blacklisted");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if not enough aproved to sell tokens", async function () {
      const { buyer1, shop, usdt, owner } = await loadFixture(deploy);
      await shop.resetTokensToSale();
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalance();

      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("Sold out!");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if not enough tokens in shop", async function () {
      const { buyer1, shop, usdt, owner } = await loadFixture(deploy);
      const totalTokensToBurn = await shop.tokenBalance();
      await shop.connect(owner).burnTokens(shop.target, totalTokensToBurn);
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalance();

      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("No more tokens available");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if reached personal limit 50k", async function () {
      const { buyer1, shop, usdt, owner } = await loadFixture(deploy);
      const usdtForSend = ethers.parseUnits("1000000", 18);
      const initialTokenBalance = await shop.tokenBalance();

      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("Allowed 50k tokens per wallet");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if reached personal limit 50k and send it somewhere", async function () {
      const { buyer1, shop, usdt, owner } = await loadFixture(deploy);
      const usdtForSend = ethers.parseUnits("18000", 18);

      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);
      await shop.connect(buyer1).convertUsdToTokens(usdtForSend);
      const buyer1Tokens = await shop.tokenBalanceOf(buyer1.address);
      await shop.burnTokens(buyer1.address, buyer1Tokens);
      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("Allowed 50k tokens per wallet");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend + usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
    });

    it("Should allow buying tokens", async function () {
      const { buyer1, shop } = await loadFixture(deploy);
      const tokenAmount = ethers.parseEther("1");

      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      const tx = await buyer1.sendTransaction(txData);
      await tx.wait();
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(
        tokenAmount * BigInt(10000)
      );
      expect(() => tx).to.changeEtherBalance(shop, tokenAmount);
      expect(tx)
        .to.emit(shop, "TokensBought")
        .withArgs(buyer1.address, tokenAmount / ethers.parseEther("0.0001"));
    });

    it("Should prevent buying tokens if listing is not active", async function () {
      const { buyer1, shop } = await loadFixture(deploy);
      await shop.updateSaleDuration(0);
      const initialBalance = await shop.tokenBalanceOf(buyer1.address);
      const tokenAmount = ethers.parseEther("1");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "Sale is not active"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
    });

    it("Should prevent buying tokens if sender is blacklisted", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      await shop.addAccToBlacklist(buyer1.address);
      const initialBalance = await shop.tokenBalanceOf(buyer1.address);
      const tokenAmount = ethers.parseEther("1");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "Sender is blacklisted"
      );
    });

    it("Should prevent buying tokens if not enough aproved to sell tokens", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      const initialBalance = await shop.tokenBalanceOf(buyer1.address);
      await shop.resetTokensToSale();
      const tokenAmount = ethers.parseEther("1");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith("Sold out!");
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
    });

    it("Should prevent buying tokens if not enough tokens in shop", async function () {
      const { shop, buyer1, owner } = await loadFixture(deploy);
      const initialBalance = await shop.tokenBalanceOf(buyer1.address);
      const totalTokensToBurn = await shop.tokenBalance();
      await shop.connect(owner).burnTokens(shop.target, totalTokensToBurn);
      const tokenAmount = ethers.parseEther("4");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };

      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "No more tokens available"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
    });

    it("Should prevent buying tokens because of limit", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      const initialBalance = await shop.tokenBalanceOf(buyer1.address);
      const tokenAmount = ethers.parseEther("6");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };

      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "Allowed 50k tokens per wallet"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
    });

    it("Should prevent buying because of personal limit even if wallet will send his tokens to another wallet and buy again", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      const tokenAmount = ethers.parseEther("4");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };

      await buyer1.sendTransaction(txData);
      const tokenBalance = await shop.tokenBalanceOf(buyer1.address);
      await shop.burnTokens(buyer1, tokenBalance);

      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "Allowed 50k tokens per wallet"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.equal(0);
    });

    it("Should allow the owner to update sale duration", async function () {
      const { owner, shop } = await loadFixture(deploy);
      const newDurationWeeks = 2;
      const oneWeakInS = 7 * 24 * 60 * 60;
      await shop.connect(owner).updateSaleDuration(newDurationWeeks);
      expect(await shop.saleDuration())
        .to.equal(newDurationWeeks * oneWeakInS)
        .to.emit(shop, "SaleDurationUpd");
    });

    it("Should allow the owner to mint tokens", async function () {
      const { shop } = await loadFixture(deploy);
      const initialTokenBalance = await shop.tokenBalance();
      const amountToMint = ethers.parseEther("1000000");
      await shop.mintTokens(shop.target, amountToMint);
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance + amountToMint);
    });

    it("Should allow the owner to burn tokens", async function () {
      const { shop } = await loadFixture(deploy);
      const initialTokenBalance = await shop.tokenBalance();
      const amountToBurn = ethers.parseEther("1000");
      await shop.burnTokens(shop.target, amountToBurn);
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance - amountToBurn);
    });

    it("Should preventd to burn tokens if amountForBurning bigger than balance", async function () {
      const { shop, owner } = await loadFixture(deploy);
      const initialTokenBalance = await shop.tokenBalance();
      const amountToBurn = initialTokenBalance + BigInt(1);
      await expect(
        shop.connect(owner).burnTokens(shop.target, amountToBurn)
      ).to.be.revertedWith("Burning more than possible");
      expect(await shop.tokenBalance()).to.equal(initialTokenBalance);
    });

    it("Should allow the owner to withdraw Ether", async function () {
      const { shop, owner, buyer1 } = await loadFixture(deploy);
      const initialBalance = await ethers.provider.getBalance(owner.address);
      const tokenAmount = ethers.parseEther("1");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      await buyer1.sendTransaction(txData);
      await shop.withdrawEther();
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });
});
