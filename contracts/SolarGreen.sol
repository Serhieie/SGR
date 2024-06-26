// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SolarGreen is ERC20, ERC20Burnable, AccessControl {

    bytes32 public constant BLACKLISTER = keccak256("BLACKLISTER");
    address public owner;

    mapping(address => bool) private _blacklist;

    event AddedToBlacklist(address indexed account);
    event RemovedFromBlacklist(address indexed account);
    event SuccessBurn(address from , uint256 newPrice);
    event SuccessMint(address to ,uint256 newDuration);
    
    constructor(address saleOwner, address initialOwner, address _shop)          
        ERC20("Solar Green", "SGR")
    {       
        require(initialOwner != address(0), "SolarGreen: You address is invalid");
        require(saleOwner != address(0), "SolarGreen: You address is invalid");
        require(_shop != address(0), "SolarGreen: You address is invalid");
        _mint(_shop, 50000000 * 10 ** decimals());
        _mint(address(this), 50000000 * 10 ** decimals());
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(BLACKLISTER, initialOwner);
        _grantRole(BLACKLISTER, saleOwner);
        _grantRole(BLACKLISTER, _shop);
         owner = initialOwner;
    }

    function grantBlRole( address account)external onlyRole(DEFAULT_ADMIN_ROLE){
        require(!hasRole(DEFAULT_ADMIN_ROLE, account), "SolarGreen: You must to be admin to grand roles");
        grantRole(BLACKLISTER, account);
    }
     function revokeBlRole( address account)external onlyRole(DEFAULT_ADMIN_ROLE){
        require(!hasRole(DEFAULT_ADMIN_ROLE, account), "SolarGreen: You must to be admin to grand roles");
        revokeRole(BLACKLISTER, account);
    }

    function addToBlacklist(address account) public onlyRole(BLACKLISTER){
        require(hasRole(BLACKLISTER, _msgSender()), "SolarGreen: You role must be admin to add to blacklist");
        require(!hasRole(DEFAULT_ADMIN_ROLE, account), "SolarGreen: Cant do this with admin");
        require(!hasRole(BLACKLISTER, account), "SolarGreen: Cannot add another blacklister to blacklist");
        _blacklist[account] = true;
        emit AddedToBlacklist(account);
    }

    function removeFromBlacklist(address account) public onlyRole(BLACKLISTER){
        require(hasRole(BLACKLISTER, _msgSender()), "SolarGreen: You role must be admin to remove from bl");
        require(!hasRole(BLACKLISTER, account), "SolarGreen: Cannot add another blacklister to bl");
        _blacklist[account] = false;
        emit RemovedFromBlacklist(account);
    }

    function isBlackListed(address account) public view returns(bool){
        return _blacklist[account];
    }

    function mint(address to, uint256 amount) public onlyRole(DEFAULT_ADMIN_ROLE){
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "SolarGreen: You role must be admin for this action!");
        _mint(to, amount);
            emit SuccessMint(to, amount);
    }

    function burnTokensFrom(address from, uint256 amount) public   onlyRole(DEFAULT_ADMIN_ROLE){
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "SolarGreen: You role must be admin for this action!");
        require(balanceOf(from) >= amount, "SolarGreen: You trying to Burn more tokens than possible");
        _burn(from, amount);
         emit SuccessBurn(from, amount);
    }

    

}
