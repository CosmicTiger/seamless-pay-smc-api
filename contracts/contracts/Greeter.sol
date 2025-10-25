// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Greeter {
    string private greeting;

    event GreetingChanged(string oldGreeting, string newGreeting);

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        string memory oldGreeting = greeting;
        greeting = _greeting;
        emit GreetingChanged(oldGreeting, _greeting);
    }
}
