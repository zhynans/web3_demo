// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * FunctionsConsumerExample using chainlink Function
 */
contract FunctionsConsumerExample is
    FunctionsClient,
    ConfirmedOwner,
    ERC721URIStorage
{
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;
    mapping(bytes32 reqId => address player) reqIdToPlayer;

    uint256 private tokenId = 0;

    uint8 private donHostedSecretsSlotID;
    uint64 private donHostedSecretsVersion;
    uint64 private subscriptionId;

    // Ethereum Sepolia Testnet
    address constant ROUTER = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    bytes32 constant DON_ID =
        0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;

    uint32 constant GAS_LIMIT = 300_000;
    string constant META_DATA =
        "ipfs://QmbEseErg5xQYaJQ2oFyvtm7NF1GKQh9qbT7AFVT3ru1sw";

    string constant SOURCE =
        'if (!secrets.apiKey) { throw Error("api key should be provided!"); }'
        "const playerAddress = args[0];"
        "const apiResponse = await Functions.makeHttpRequest({"
        "url: `https://dufk5fjc4nqd2vtpu6rmireule0lminz.lambda-url.ap-northeast-2.on.aws/?player_address=${playerAddress}`,"
        'method: "GET",'
        "headers: {"
        '    "x-api-key": secrets.apiKey,'
        "},"
        "});"
        "if (apiResponse.error) {"
        "console.error(apiResponse.error);"
        'throw Error("Request failed");'
        "}"
        "const { data } = apiResponse;"
        "if (!data.score) {"
        'console.error("score does not exist");'
        'throw Error("score does not exist");'
        "}"
        'console.log("API response data:", JSON.stringify(data, null, 2));'
        "return Functions.encodeInt256(data.score);";

    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);

    constructor()
        FunctionsClient(ROUTER)
        ConfirmedOwner(msg.sender)
        ERC721("BlackJack", "BJK")
    {}

    function setDonHostedSecrets(
        uint8 _slotID,
        uint64 _version,
        uint64 _subscriptionId
    ) external onlyOwner {
        donHostedSecretsSlotID = _slotID;
        donHostedSecretsVersion = _version;
        subscriptionId = _subscriptionId;
    }

    /**
     * @notice Send a simple request
     * @param args List of arguments accessible from within the source code
     */
    function sendRequest(
        string[] memory args,
        address playerAddr
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);

        req.addDONHostedSecrets(
            donHostedSecretsSlotID,
            donHostedSecretsVersion
        );

        if (args.length > 0) req.setArgs(args);

        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            GAS_LIMIT,
            DON_ID
        );
        reqIdToPlayer[s_lastRequestId] = playerAddr;

        return s_lastRequestId;
    }

    /**
     * @notice Store latest result/error
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        s_lastResponse = response;
        s_lastError = err;

        int256 score = abi.decode(response, (int256));

        // when score >= 1000, give a NFT token.
        if (score >= 1000) {
            address playerAddr = reqIdToPlayer[requestId];
            _safeMint(playerAddr, tokenId);
            _setTokenURI(tokenId, META_DATA);
            tokenId++;
        }
        delete reqIdToPlayer[requestId];

        emit Response(requestId, s_lastResponse, s_lastError);
    }
}
