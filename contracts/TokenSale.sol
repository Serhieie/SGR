// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SolarGreen.sol";


contract TokenSale is Ownable {
    AggregatorV3Interface internal ethFeed;
    
    mapping(address => uint256) public personalTokenBalances;
    
    //token price in usd  0.0001 * ethPriceInUsdt
    SolarGreen public token;
    IERC20 public stablecoin;
    uint256 public totalSupply = 100000000 * 10 ** 18;
    uint256 public tokenPrice = 100000000000000; 
    uint public saleStartTime;
    uint public saleDuration;
    uint256 public tokensSold;
    uint256 public tokensForSale;
    uint256 public ethPrice;
    uint256 public  priceEthInUSD; 

    event TokensBought(address indexed buyer, uint256 amount);
    event TokenPriceUpd(uint256 newPrice);
    event SaleDurationUpd(uint256 newDuration);
    event SuccessBurn(address from , uint256 newPrice);
    event SuccessMint(address to ,uint256 newDuration);


    constructor() Ownable(msg.sender) {
        ethFeed = AggregatorV3Interface(
            0x694AA1769357215DE4FAC081bf1f309aDC325306
        );
        stablecoin = ERC20(address(0x1531BC5dE10618c511349f8007C08966E45Ce8ef));
        token = new SolarGreen(address(this));
        saleStartTime = block.timestamp;
        saleDuration =  5 weeks;
        tokensForSale = totalSupply / 2;
        ethPriceForTest();
        // updateTokenPriceUSD();
    }


    //test foo =======
    function ethPriceForTest() public {
    ethPrice = 3630 * 10 ** 18;
    priceEthInUSD = 3630;
    }
   // ===================


    modifier aucIsOpenAndNotBlacklisted() {
    require(!isAccBlacklisted(msg.sender), "Sender is blacklisted");
    require(block.timestamp >= saleStartTime &&
     block.timestamp <= saleStartTime + saleDuration, "Sale is not active");
    _;
    }


    function updateTokensForSale(uint256 _newTokensForSale) external onlyOwner {
    require(tokensForSale + _newTokensForSale * 
    10 ** 18 <= totalSupply, "Not enough tokens");
    tokensForSale += _newTokensForSale * 10 ** 18;
    }


    function resetTokensToSale() external onlyOwner {
    tokensForSale = 0;
    }

    function tokenBalanceOf(address _address) public view  returns(uint) {
        return token.balanceOf(_address);
    }
    
    function addAccToBlacklist(address account) external onlyOwner {
        token.addToBlacklist(account);
    }

    function removeAccFromBlacklist(address account) external onlyOwner {
        token.removeFromBlacklist(account);
    }

        function isAccBlacklisted(address account) public view returns (bool) {
    return token.isBlackListed(account);
    }


    function updateSaleDuration(uint16 _newDurationWeeks) external onlyOwner {
            if(_newDurationWeeks == 0) saleDuration = 0;
             else saleDuration = _newDurationWeeks * 1 weeks;

        emit SaleDurationUpd(saleDuration);
    }

    function mintTokens(address to, uint256 amount) external onlyOwner {
        token.mint(to, amount);
        emit SuccessMint(to, amount);
    }

    function burnTokens(address from, uint256 amount) external onlyOwner {
        require(token.balanceOf(from) >= amount, "Burning more than possible");
        token.burn(from, amount);
         emit SuccessBurn(from, amount);
    }
    
    function tokenBalance() public view returns (uint) {
        return token.balanceOf(address(this));
    }

    function stablecoinBalance(address _address) public view returns (uint) {
    return stablecoin.balanceOf(_address);
        }


    function getLastEthPrice() public view returns (uint) {
    (
        /* uint80 roundID */,
        int answer,
        /*uint startedAt*/,
        /*uint timeStamp*/,
        /*uint80 answeredInRound*/
    ) = ethFeed.latestRoundData();

    require(answer >= 0, "Invalid Ethereum price");
    return uint256(answer);
    }

    function updateTokenPriceUSD() public  {
        ethPrice = getLastEthPrice();
        require(ethPrice > 0, "Invalid Ethereum price");
        priceEthInUSD =  (uint256(ethPrice) * 10 ** 10); 
    }



    //check all requires
    function requiresForBuying(uint amount, bool eth) internal view returns(uint256){ 
                require(!isAccBlacklisted(msg.sender), "Sender is blacklisted");
        require(block.timestamp >= saleStartTime &&
        block.timestamp <= saleStartTime + saleDuration, "Sale is not active");
        //for deploy
        // updateTokenPriceUSD();
        uint256 tokensToBuy = eth ? (amount / tokenPrice) * 10 ** 18 : (amount  * 10 ** 18) / (priceEthInUSD * tokenPrice);
        require(tokensToBuy > 0, "not enough funds!");
        require(tokenBalance() > tokensToBuy,  "No more tokens available");
        require(tokensForSale >= tokensToBuy,  "Sold out!");
        require(personalTokenBalances[msg.sender] + tokensToBuy <= 50000 * 10 ** 18,
        "Allowed 50k tokens per wallet");
        return tokensToBuy;
    }

    function successPushase(uint256 tokensToBuy) internal{
            personalTokenBalances[msg.sender] += tokensToBuy;
        tokensSold += tokensToBuy;
        tokensForSale -= tokensToBuy;   
        emit TokensBought(msg.sender, tokensToBuy);
    }



    function convertUsdToTokens(uint256 amount) external aucIsOpenAndNotBlacklisted{
        uint256 tokensToBuy = requiresForBuying(amount, false);
        //Працює тільки якшо апрувнути на езерскані 
        // stablecoin.approve(address(this), amount);
        // require(stablecoin.allowance(msg.sender, address(this)) >=
        //  amount,  "Allowance too low");
        //for deploy
        // stablecoin.transferFrom(msg.sender, address(this), amount);
        token.transfer(msg.sender, tokensToBuy);
        successPushase(tokensToBuy);
        }




    // Recieve ether and convert it to the Solar Green
    receive() external payable aucIsOpenAndNotBlacklisted {
        uint256 tokensToBuy = requiresForBuying(msg.value, true);
        token.transfer(msg.sender, tokensToBuy);
        successPushase(tokensToBuy);
    }


        function withdrawEther() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

}
