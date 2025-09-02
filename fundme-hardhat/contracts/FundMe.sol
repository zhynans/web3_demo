// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// 1、创建一个收款函数
// 2、记录投资人并且查看
// 3、在锁定期内，达到目标值，生产商可以提款
// 4、在锁定期内，没有达到目标值，投资人可以退款

contract FundMe {
    mapping(address => uint256) public fundersToAmount;

    uint256 constant MIN_VALUE = 1 * 10 ** 15; // 最小值，1Finney = 0.001ETH

    AggregatorV3Interface public dataFeed;

    uint256 constant TARGET = 1 * 10 ** 18; // 单位：USD，目标值：1美元，eth单位是10^18次方

    address public owner; // 合约的拥有者

    uint256 deploymentTimeStamp; // 合约部署时间
    uint256 lockTime; // 锁定期时间

    address erc20Addr;

    bool public getFundSuccess = false; // 众筹状态：是否成功

    event FundWithdrawByOwner(uint256);
    event RefundByFunder(address, uint256);

    constructor(uint256 _lockTime, address _dataFeed) {
        // 预言机的sepolia testnet地址
        dataFeed = AggregatorV3Interface(_dataFeed);
        owner = msg.sender; // 部署合同的人
        deploymentTimeStamp = block.timestamp;
        lockTime = _lockTime;
    }

    // 收款函数，加了payable即可
    function fund() external payable {
        require(
            block.timestamp < deploymentTimeStamp + lockTime,
            "the fund is closed"
        );
        require(msg.value >= MIN_VALUE, "too less");
        fundersToAmount[msg.sender] = msg.value;
    }

    function getChainlinkDataFeedLatestAnswer() public view returns (int) {
        // prettier-ignore
        (
            /* uint80 roundId */,
            int256 answer,
            /*uint256 startedAt*/,
            /*uint256 updatedAt*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return answer;
    }

    function convertEthToUsd(
        uint256 ethAmount
    ) internal view returns (uint256) {
        uint256 ethPrice = uint256(getChainlinkDataFeedLatestAnswer());
        return (ethAmount * ethPrice) / (10 ** 8);
    }

    // 修改合约的拥有人地址
    function transferOwnerShop(address newOwner) public onlyOwner {
        owner = newOwner;
    }

    // 查看筹款金额是否达标
    function getFund() external onlyOwner windowClose {
        require(
            convertEthToUsd(address(this).balance) >= TARGET,
            "Target is not reached"
        );

        uint256 balance = address(this).balance;
        // 提款
        payable(msg.sender).transfer(balance);

        // 众筹成功
        getFundSuccess = true;

        // emit event
        emit FundWithdrawByOwner(balance);
    }

    function refund() external windowClose {
        require(
            convertEthToUsd(address(this).balance) < TARGET,
            "Target is reached"
        );
        require(fundersToAmount[msg.sender] != 0, "there is no fund for you");

        uint256 amount = fundersToAmount[msg.sender];
        bool success;
        (success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "refund failed");
        fundersToAmount[msg.sender] = 0; // 清空mapping

        emit RefundByFunder(msg.sender, amount);
    }

    function setFunderToAmount(
        address funder,
        uint256 amountToUpdate
    ) external {
        require(
            msg.sender == erc20Addr,
            "you are not allowed to call this function"
        );
        fundersToAmount[funder] = amountToUpdate;
    }

    function setERC20Addr(address erc20Addr_) public onlyOwner {
        erc20Addr = erc20Addr_;
    }

    // 判断锁定期是否达到
    modifier windowClose() {
        require(
            block.timestamp >= deploymentTimeStamp + lockTime,
            "the fund is not closed"
        );
        _;
    }

    // 判断是否合约拥有者
    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "this funciotn can only be called  by owner"
        );
        _;
    }
}
