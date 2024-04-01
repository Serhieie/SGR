// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SolarGreen is ERC20, ERC20Burnable, Ownable, AccessControl {

    bytes32 public constant BLACKLIST_ADMIN = keccak256("BLACKLIST_ADMIN");

    mapping(address => bool) private _blacklist;

    event AddedToBlacklist(address indexed account);
    event RemovedFromBlacklist(address indexed account);
    
    constructor(address initialOwner)
        ERC20("Solar Green", "SGR")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 100000000 * 10 ** decimals()); 
        _grantRole(BLACKLIST_ADMIN, initialOwner);
    }

    function addToBlacklist(address account) public {
        require(hasRole(BLACKLIST_ADMIN, _msgSender()), "SolarGreen: must be admin to add to blacklist");
        _blacklist[account] = true;
        emit AddedToBlacklist(account);
    }

    function removeFromBlacklist(address account) public {
        require(hasRole(BLACKLIST_ADMIN, _msgSender()), "SolarGreen: must be admin to remove from blacklist ");
        _blacklist[account] = false;
        emit RemovedFromBlacklist(account);
    }

    function isBlackListed(address account) public view returns(bool){
        return _blacklist[account];
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
}
