// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UsdtForTest is ERC20, Ownable {
    
    constructor(address initialOwner)
        ERC20("uUSDT", "uUSDT")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 1000000000 * 10 ** decimals()); 
    }

}
