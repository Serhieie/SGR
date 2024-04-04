// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SolarGreen.sol";


contract TokenSale is Ownable {
    AggregatorV3Interface internal ethFeed;
    mapping(address => uint256) public vesting;

    SolarGreen public token;
    IERC20 public stablecoin;
    uint256 public limitPerWallet = 50000;
    uint256 public tokenPriceUsd;//~0.42$ * 10^18
    uint256 public vestingEndTime = 1735682399; //31 dec 2024 23:59:59
    uint256 public saleStartTime = 1710428399;// 14 of mrch 17:00
    bool public saleStarted = false; //that contract was deployed before 14 of mrch
    uint public saleDuration =  5 weeks;
    uint256 public tokensForSale;
    address private tokenOwner;

    event TokensBought(address indexed buyer, uint256 amount);
    event TokenPriceUpd(uint256 newPrice);
    event SaleDurationUpd(uint256 newDuration);

    constructor( address _tokenOwner, address _priceFeed,
     address _usdt, uint256 _tokenPrice ) Ownable(msg.sender) {
        require(_tokenOwner != address(0), "TokenSale: tokenOwner address is invalid");
        require(_priceFeed != address(0), "TokenSale: priceFeed address is invalid");
        require(_usdt != address(0), "TokenSale: usdt address is invalid");
        require(_tokenPrice >= 0, "TokenSale: invalid token price");
        ethFeed = AggregatorV3Interface(_priceFeed);
        stablecoin = IERC20(_usdt);
        token = new SolarGreen(msg.sender, _tokenOwner, address(this));
        tokensForSale = tokenSupply() / 2;
        tokenPriceUsd = _tokenPrice;
        tokenOwner = _tokenOwner;
        startSale();
    }


    modifier aucIsOpenAndNotBlacklisted() {
        require(!isAccBlacklisted(msg.sender), "TokenSale: You are blacklisted");
        require(block.timestamp >= saleStartTime &&
        block.timestamp <= saleStartTime + saleDuration, "TokenSale: Sale is not active");
        _;
    }

     modifier onlyBlacklister() {
        require(token.hasRole(token.BLACKLISTER(), msg.sender), "TokenSale: You are not blacklister");
        require(msg.sender != address(0), "SolarGreen: Invalid address");
        _;
    }

    modifier onlyTokenOwner() {
        require(msg.sender == tokenOwner, "SolarGreen: You address is not tokenOwner address");
        _;
    }

    function startSale() public onlyOwner {
        require(block.timestamp >= saleStartTime, "TokenSale: Sale has not started yet");
        saleStarted = true;
    }

    function updateTokensForSale(uint256 _newTokensForSale) external onlyOwner {
        require(tokensForSale + _newTokensForSale * 
        10 ** 18 <= tokenSupply(), "TokenSale: Not enough tokens");
        if(_newTokensForSale <=0) {
             tokensForSale = 0;
        } else tokensForSale += _newTokensForSale * 10 ** 18;
    }


    function tokenBalanceOf(address _address) public view  returns(uint) {
        return token.balanceOf(_address);
    }

    function stablecoinBalance() external view  returns(uint) {
        return stablecoin.balanceOf(address(this));
    }
    
    function addAccToBlacklist(address account) external onlyBlacklister {
        require(token.hasRole(token.BLACKLISTER(), msg.sender), "TokenSale: Sender have no blacklister role");
        token.addToBlacklist(account);
    }

    function removeAccFromBlacklist(address account) external onlyBlacklister {
        require(token.hasRole(token.BLACKLISTER(), msg.sender), "TokenSale: Sender have no blacklister role");
        token.removeFromBlacklist(account);
    }

    function isAccBlacklisted(address account) public view  returns (bool) {
        return token.isBlackListed(account);
    }


    function updateSaleDuration(uint16 _newDurationWeeks) external onlyOwner {
            if(_newDurationWeeks == 0) saleDuration = 0;
            else saleDuration = _newDurationWeeks * 1 weeks;
            emit SaleDurationUpd(saleDuration);
    }

    function updateVestingTime(uint256 newDate) external onlyOwner{
        require(block.timestamp <= vestingEndTime,
         "TokenSale: You cant to change vesting time after its finish");
         require(msg.sender == owner(), "TokenSale: Only owner available to change vesting time");
        vestingEndTime = newDate;
    }

    function tokenBalance() internal view returns (uint) {
        return token.balanceOf(address(this));
    }
    function tokenSupply() internal view returns (uint) {
        return token.totalSupply();
    }

    function getLastEthPriceInUsd() internal view returns (uint) {
    (
        /* uint80 roundID */,
        int answer,
        /*uint startedAt*/,
        /*uint timeStamp*/,
        /*uint80 answeredInRound*/
    ) = ethFeed.latestRoundData();
    require(answer >= 0, "Invalid Ethereum price");
    answer =  (answer * 10 ** 10); 
    return uint(answer);
    }

    function isSaleActive() internal view returns (bool) {
        return block.timestamp >= saleStartTime && block.timestamp <= saleStartTime + saleDuration;
    }

    function calculateTokenAmount(bool eth, uint amount) internal view  returns(uint256){
         return  eth ? (amount * getLastEthPriceInUsd()) / tokenPriceUsd :
        amount * 10 ** 18  / tokenPriceUsd;
    }

    //check all requires
    function requiresForBuying( uint256 tokensToBuy) internal view returns(uint256){ 
        require(!isAccBlacklisted(msg.sender), "TokenSale: Sender is blacklisted");
        require(isSaleActive(), "TokenSale: Sale is not active");
        require(tokensToBuy > 0, "TokenSale: not enough funds!");
        require(tokenBalance() > tokensToBuy,  "TokenSale: No more tokens available");
        require(tokensForSale >= tokensToBuy,  "TokenSale: Sold out!");
        require(vesting[msg.sender] + tokensToBuy <= limitPerWallet * 10 ** 18,
        "TokenSale: Allowed 50k tokens per wallet");
        return tokensToBuy;
    }

    //success purshase operations
    function successPushase(uint256 tokensToBuy) internal{
        vesting[msg.sender] += tokensToBuy;
        tokensForSale -= tokensToBuy;   
        emit TokensBought(msg.sender, tokensToBuy);
    }

    function convertUsdToTokens(uint256 amount) external aucIsOpenAndNotBlacklisted{
        //calc amount of tokens
        uint256 tokensToBuy = calculateTokenAmount(false, amount);
        //check operation requires
        requiresForBuying(tokensToBuy);
        stablecoin.transferFrom(msg.sender, address(this), amount);
         //operations with succes transaction
        successPushase(tokensToBuy);
    }

    // Recieve ether and convert ETH to SG
    receive() external payable aucIsOpenAndNotBlacklisted {
        //calc amount of tokens
        uint256 tokensToBuy = calculateTokenAmount(true, msg.value);
        //check operation requires
        requiresForBuying(tokensToBuy);
        //operations with succes transaction
        successPushase(tokensToBuy);
    }

    //claim tokens after vesting period 
    function claimTokens() external {
        require(block.timestamp > vestingEndTime, "TokenSale: Tokens are still vesting");
        uint256 amount = vesting[msg.sender];
        require(amount > 0, "TokenSale: You have no tokens to claim");
        token.transfer(msg.sender, amount);
        vesting[msg.sender] = 0;
    }

    //withdraw ether after vesting period
    function withdrawEther() external  onlyTokenOwner{
        require(msg.sender == tokenOwner, "SolarGreen: You address is not tokenOwner address");
        require(block.timestamp > vestingEndTime,
         "TokenSale: You cant to take ether before vesting");
        payable(tokenOwner).transfer(address(this).balance);
    }

        function withdrawUSDT() external  onlyTokenOwner{
        require(msg.sender == tokenOwner, "SolarGreen: You address is not tokenOwner address");
        require(block.timestamp > vestingEndTime,
         "TokenSale: You cant to take usdt before vesting");
         stablecoin.transfer(tokenOwner, stablecoin.balanceOf(address(this)));
        }

}
