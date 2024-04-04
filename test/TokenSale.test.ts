import { loadFixture, ethers, expect } from "./setup";
import { TokenSale } from "../typechain-types/contracts/TokenSale";
import { UsdtForTest } from "../typechain-types/contracts/test/UsdtForTest";
import { SolarGreen } from "../typechain-types";

describe("TokenSale", function () {
  async function deploy() {
    const tokenPriceInUsd = ethers.parseUnits("0.42", 18);
    const [owner, tokenOwner, buyer1, buyer2] = await ethers.getSigners();
    const TShopFactory = await ethers.getContractFactory("TokenSale", owner);

    //eth price 3630 usd
    const mockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    const eth = await mockV3Aggregator.deploy(18, 363000000000);
    await eth.waitForDeployment();

    //staiblecoin
    const UsdtFactroy = await ethers.getContractFactory("UsdtForTest", owner);
    const usdt: UsdtForTest = await UsdtFactroy.deploy(owner);
    await usdt.waitForDeployment();

    const shop: TokenSale = await TShopFactory.deploy(
      tokenOwner,
      eth.target,
      usdt.target,
      tokenPriceInUsd
    );
    await shop.waitForDeployment();

    const sgrAddress = await shop.token();
    const sgr: SolarGreen = await ethers.getContractAt("SolarGreen", sgrAddress, owner);

    return { owner, buyer1, buyer2, shop, usdt, sgr, tokenOwner };
  }

  describe("Deployment", function () {
    it("Should set the owner as the deployer", async function () {
      const { owner, shop } = await loadFixture(deploy);
      expect(await shop.owner()).to.equal(owner.address);
    });

    it("Should set start time 14 of mrch 17:00", async function () {
      const { shop } = await loadFixture(deploy);
      const unixTimestamp = await shop.saleStartTime();
      const expectedDate = new Date(Number(unixTimestamp) * 1000);
      const expectedDateString = expectedDate.toLocaleString();
      expect(expectedDateString).to.equal("14.03.2024, 16:59:59");
    });

    it("Should set vesting end time at 31 dec 2024 23:59:59", async function () {
      const { shop } = await loadFixture(deploy);
      const unixTimestamp = await shop.vestingEndTime();
      const expectedDate = new Date(Number(unixTimestamp) * 1000);
      const expectedDateString = expectedDate.toLocaleString();
      expect(expectedDateString).to.equal("31.12.2024, 23:59:59");
    });

    it("Should deploy test contract with some balance for test", async function () {
      const { usdt } = await loadFixture(deploy);
      const expectedSupply = ethers.parseEther("1000000000");
      expect(await usdt.totalSupply()).to.equal(expectedSupply);
    });

    it("Token price must be 0.42 usd", async function () {
      const { shop } = await loadFixture(deploy);
      const tokenPrice = ethers.parseUnits("0.42", 18);
      expect(await shop.tokenPriceUsd()).to.equal(tokenPrice);
    });

    it("Limit per wallet is 50 000", async function () {
      const { shop } = await loadFixture(deploy);
      expect(await shop.limitPerWallet()).to.equal(50000);
    });

    it("Tokens for sale is 50 millions", async function () {
      const { shop } = await loadFixture(deploy);
      const tokensForSale = BigInt(50000000) * BigInt(10 ** 18);
      expect(await shop.tokensForSale()).to.equal(tokensForSale);
    });
  });

  describe("Functionality", function () {
    it("Should allow buying tokens with uUSDT", async function () {
      const { buyer1, shop, usdt } = await loadFixture(deploy);
      const usdtForSend = ethers.parseUnits("10", 18);
      const tokenPriceInUsd = await shop.tokenPriceUsd();
      const tokensToBuy = (usdtForSend * BigInt(10 ** 18)) / tokenPriceInUsd;
      await usdt.transfer(buyer1.address, usdtForSend);
      await usdt.connect(buyer1).approve(shop.target, usdtForSend);
      const tx = await shop.connect(buyer1).convertUsdToTokens(usdtForSend);
      await tx.wait();

      expect(await usdt.balanceOf(buyer1.address)).to.equal(0);
      expect(await usdt.balanceOf(shop.target)).to.equal(usdtForSend);

      expect(await shop.vesting(buyer1.address)).to.equal(tokensToBuy);
      await expect(tx)
        .to.emit(shop, "TokensBought")
        .withArgs(buyer1.address, tokensToBuy);
    });

    it("Should prevent buying tokens with uUSDT if listing is not active", async function () {
      const { buyer1, shop, usdt } = await loadFixture(deploy);
      await shop.updateSaleDuration(0);
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalanceOf(shop.target);

      await usdt.transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("TokenSale: Sale is not active");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalanceOf(shop.target)).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if user in black list", async function () {
      const { buyer1, shop, usdt, owner, tokenOwner } = await loadFixture(deploy);
      await shop.addAccToBlacklist(buyer1.address);
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalanceOf(shop.target);

      await usdt.connect(owner).transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("TokenSale: You are blacklisted");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalanceOf(shop.target)).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if not enough aproved to sell tokens", async function () {
      const { buyer1, shop, usdt } = await loadFixture(deploy);
      await shop.updateTokensForSale(0);
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalanceOf(shop.target);

      await usdt.transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("TokenSale: Sold out!");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalanceOf(shop.target)).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if not enough tokens in shop", async function () {
      const { buyer1, shop, usdt, tokenOwner, sgr } = await loadFixture(deploy);
      const totalTokensToBurn = await shop.tokenBalanceOf(shop.target);
      await sgr.connect(tokenOwner).burnTokensFrom(shop.target, totalTokensToBurn);
      const usdtForSend = ethers.parseUnits("10", 18);
      const initialTokenBalance = await shop.tokenBalanceOf(shop.target);

      await usdt.transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(shop.convertUsdToTokens(usdtForSend)).to.be.revertedWith(
        "TokenSale: No more tokens available"
      );
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalanceOf(shop.target)).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if reached personal limit 50k", async function () {
      const { buyer1, shop, usdt } = await loadFixture(deploy);
      const usdtForSend = ethers.parseUnits("100000", 18);
      const initialTokenBalance = await shop.tokenBalanceOf(shop.target);
      await usdt.transfer(buyer1.address, usdtForSend);
      await usdt.approve(shop.target, usdtForSend);

      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("TokenSale: Allowed 50k tokens per wallet");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(0);
      expect(await shop.tokenBalanceOf(shop.target)).to.equal(initialTokenBalance);
    });

    it("Should prevent buying tokens with uUSDT if reached personal limit 50k and send it somewhere", async function () {
      const { buyer1, shop, usdt } = await loadFixture(deploy);
      const usdtForSend = ethers.parseUnits("18000", 18);

      await usdt.transfer(buyer1.address, usdtForSend);
      await usdt.connect(buyer1).approve(shop.target, usdtForSend);
      await shop.connect(buyer1).convertUsdToTokens(usdtForSend);
      await usdt.transfer(buyer1.address, usdtForSend);
      await usdt.connect(buyer1).approve(shop.target, usdtForSend);
      await expect(
        shop.connect(buyer1).convertUsdToTokens(usdtForSend)
      ).to.be.revertedWith("TokenSale: Allowed 50k tokens per wallet");
      expect(await usdt.balanceOf(buyer1.address)).to.equal(usdtForSend);
      expect(await usdt.balanceOf(shop.target)).to.equal(usdtForSend);

      //check vesting
      const decimals = ethers.parseUnits("1", 18);
      const tokenPriceInUsd = await shop.tokenPriceUsd();
      const tokensToBuy = (usdtForSend * decimals) / tokenPriceInUsd;
      expect(await shop.vesting(buyer1.address)).to.equal(tokensToBuy);
    });

    it("Should allow to buy tokens", async function () {
      const { buyer1, shop } = await loadFixture(deploy);
      const sendedEth = ethers.parseEther("1");
      const tokenPriceInUsd = await shop.tokenPriceUsd();
      const priceEthInUsd = ethers.parseUnits("3630", 18);
      const tokenAmount = (sendedEth * priceEthInUsd) / tokenPriceInUsd;
      const txData = {
        value: sendedEth,
        to: shop.target,
      };
      const tx = await buyer1.sendTransaction(txData);
      await tx.wait();
      expect(await shop.vesting(buyer1.address)).to.equal(tokenAmount);
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
        "TokenSale: Sale is not active"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
    });

    it("Should prevent buying tokens if sender is blacklisted", async function () {
      const { shop, buyer1, owner } = await loadFixture(deploy);
      await shop.connect(owner).addAccToBlacklist(buyer1.address);
      const initialBalance = await shop.tokenBalanceOf(buyer1.address);
      const tokenAmount = ethers.parseEther("1");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "TokenSale: You are blacklisted"
      );
    });

    it("Should prevent buying tokens if not enough aproved to sell tokens", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      const initialBalance = await shop.tokenBalanceOf(buyer1.address);
      await shop.updateTokensForSale(0);
      const tokenAmount = ethers.parseEther("1");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "TokenSale: Sold out!"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
    });

    it("Should prevent buying tokens if not enough tokens in shop", async function () {
      const { shop, buyer1, tokenOwner, sgr } = await loadFixture(deploy);
      const initialBalance = await shop.tokenBalanceOf(buyer1.address);
      const totalTokensToBurn = await shop.tokenBalanceOf(shop.target);
      await sgr.connect(tokenOwner).burnTokensFrom(shop.target, totalTokensToBurn);
      const tokenAmount = ethers.parseEther("4");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };

      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "TokenSale: No more tokens available"
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
        "TokenSale: Allowed 50k tokens per wallet"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(initialBalance);
    });

    it("Should prevent buying because of personal limit even if wallet will send his tokens to another wallet and buy again", async function () {
      const { shop, buyer1, sgr, tokenOwner } = await loadFixture(deploy);
      const tokenAmount = ethers.parseEther("4");

      const txData = {
        value: tokenAmount,
        to: shop.target,
      };

      await buyer1.sendTransaction(txData);
      const tokenBalance = await shop.tokenBalanceOf(buyer1.address);
      await sgr.connect(tokenOwner).burnTokensFrom(buyer1, tokenBalance);

      await expect(buyer1.sendTransaction(txData)).to.be.revertedWith(
        "TokenSale: Allowed 50k tokens per wallet"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.equal(0);
    });

    it("Should allow the owner to update sale duration", async function () {
      const { shop } = await loadFixture(deploy);
      const newDurationWeeks = 2;
      const oneWeakInS = 7 * 24 * 60 * 60;
      await shop.updateSaleDuration(newDurationWeeks);
      expect(await shop.saleDuration())
        .to.equal(newDurationWeeks * oneWeakInS)
        .to.emit(shop, "SaleDurationUpd");
    });

    it("Should allow the owner to update sale duration to 0", async function () {
      const { shop } = await loadFixture(deploy);
      const newDurationWeeks = 0;
      await shop.updateSaleDuration(newDurationWeeks);
      expect(await shop.saleDuration())
        .to.equal(newDurationWeeks)
        .to.emit(shop, "SaleDurationUpd");
    });

    it("Should allow the owner to update tokens for sale", async function () {
      const { shop } = await loadFixture(deploy);
      const initialTokensForSale = await shop.tokensForSale();
      const upFor = BigInt(1000);
      await shop.updateTokensForSale(upFor);
      expect(await shop.tokensForSale())
        .to.equal(initialTokensForSale + upFor * BigInt(10 ** 18))
        .to.emit(shop, "SaleDurationUpd");
    });

    it("Should allow the owner to update tokens for sale to 0 value", async function () {
      const { shop } = await loadFixture(deploy);
      const upFor = 0;
      await shop.updateTokensForSale(upFor);
      expect(await shop.tokensForSale())
        .to.equal(upFor)
        .to.emit(shop, "SaleDurationUpd");
    });

    it("should allow claiming tokens after vesting period ends", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      const vestingEndTime = 1735689599;
      const sendedEth = ethers.parseEther("1");
      const tokenPriceInUsd = await shop.tokenPriceUsd();
      const priceEthInUsd = ethers.parseUnits("3630", 18);
      const tokenAmount = (sendedEth * priceEthInUsd) / tokenPriceInUsd;

      const txData = {
        value: sendedEth,
        to: shop.target,
      };
      const tx = await buyer1.sendTransaction(txData);
      await tx.wait();
      await ethers.provider.send("evm_setNextBlockTimestamp", [vestingEndTime + 1]);
      await ethers.provider.send("evm_mine");
      await shop.connect(buyer1).claimTokens();
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(tokenAmount);
    });

    it("should prevent claiming tokens after vesting period ends if no tokens in vesting", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      const vestingEndTime = 1735689599;
      await ethers.provider.send("evm_setNextBlockTimestamp", [vestingEndTime + 1]);
      await ethers.provider.send("evm_mine");
      await expect(shop.connect(buyer1).claimTokens()).to.be.revertedWith(
        "TokenSale: You have no tokens to claim"
      );
      expect(await shop.tokenBalanceOf(buyer1.address)).to.eq(0);
    });

    it("Should allow the owner to withdraw Ether", async function () {
      const { shop, owner, buyer1 } = await loadFixture(deploy);
      const vestingEndTime = 1735689599;
      const initialBalance = await ethers.provider.getBalance(owner.address);
      const tokenAmount = ethers.parseEther("1");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      await buyer1.sendTransaction(txData);
      await ethers.provider.send("evm_setNextBlockTimestamp", [vestingEndTime + 1]);
      await ethers.provider.send("evm_mine");
      await shop.withdrawEther();
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow owner to withdraw Ether before vesting end", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      const tokenAmount = ethers.parseEther("1");
      const txData = {
        value: tokenAmount,
        to: shop.target,
      };
      await buyer1.sendTransaction(txData);
      await expect(shop.withdrawEther()).to.be.revertedWith(
        "TokenSale: You cant to take ether before vesting"
      );
    });

    it("should allow add and remove from bl if you have blacklisterRole", async function () {
      const { shop, buyer1, sgr, buyer2, tokenOwner } = await loadFixture(deploy);
      await sgr.connect(tokenOwner).grantBlRole(buyer2.address);
      await shop.connect(buyer2).addAccToBlacklist(buyer1.address);
      expect(await shop.isAccBlacklisted(buyer1.address)).to.equal(true);
      await shop.connect(buyer2).removeAccFromBlacklist(buyer1.address);
      expect(await shop.isAccBlacklisted(buyer1.address)).to.equal(false);
    });

    it("should not allow add and remove from bl if have no blacklister role", async function () {
      const { shop, buyer1, buyer2 } = await loadFixture(deploy);
      await expect(shop.connect(buyer1).addAccToBlacklist(buyer2.address)).revertedWith(
        "TokenSale: You are not blacklister"
      );

      await shop.addAccToBlacklist(buyer2.address);
      await expect(
        shop.connect(buyer1).removeAccFromBlacklist(buyer2.address)
      ).revertedWith("TokenSale: You are not blacklister");
    });

    it("should allow the owner to change vesting time", async function () {
      const { shop } = await loadFixture(deploy);
      const vestingTime = await shop.vestingEndTime();
      await shop.updateVestingTime(vestingTime + BigInt(1));
      expect(await shop.vestingEndTime()).to.be.equal(vestingTime + BigInt(1));
    });

    it("should not allow users to change vesting time", async function () {
      const { shop, buyer1 } = await loadFixture(deploy);
      const vestingTime = await shop.vestingEndTime();
      await expect(shop.connect(buyer1).updateVestingTime(vestingTime + BigInt(1))).to.be
        .reverted;
      expect(await shop.vestingEndTime()).to.be.equal(vestingTime);
    });

    it("should show usdt balance", async function () {
      const { shop, usdt } = await loadFixture(deploy);
      const usdtToMint = ethers.parseUnits("1", 18);
      await usdt.transfer(shop.target, usdtToMint);
      expect(await shop.stablecoinBalance()).to.equal(usdtToMint);
    });
  });
});
