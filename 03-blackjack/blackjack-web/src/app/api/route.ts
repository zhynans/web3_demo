import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { verifyMessage } from "viem";
import jwt from "jsonwebtoken";

// 初始化 DynamoDB 客户端，添加访问密钥配置
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "", // 根据需要调整区域
  credentials: {
    accessKeyId: process.env.AWS_USER_ACCESS_KEY_ID || "", // 替换为你的 AWS Access Key ID
    secretAccessKey: process.env.AWS_USER_SECRET_ACCESS_KEY || "", // 替换为你的 AWS Secret Access Key
  },
});

// 表名和接口定义
const TABLE_NAME = "demo_blackjack";

interface PlayerScore {
  player_address: string;
  score: number;
}

// 写入 score 到 DynamoDB
async function writeScore(playerAddress: string, score: number): Promise<void> {
  const params = {
    TableName: TABLE_NAME,
    Item: marshall({
      player_address: playerAddress,
      score: score,
    }),
  };

  try {
    const command = new PutItemCommand(params);
    await client.send(command);
    console.log(
      `Successfully wrote score ${score} for player ${playerAddress}`
    );
  } catch (error) {
    console.error("Error writing to DynamoDB:", error);
    throw error;
  }
}

// 读取 score 从 DynamoDB
async function readScore(playerAddress: string): Promise<number | null> {
  const params = {
    TableName: TABLE_NAME,
    Key: marshall({
      player_address: playerAddress,
    }),
  };

  try {
    const command = new GetItemCommand(params);
    const response = await client.send(command);

    if (response.Item) {
      const item = unmarshall(response.Item) as PlayerScore;
      return item.score;
    } else {
      console.log(`No score found for player ${playerAddress}`);
      return null;
    }
  } catch (error) {
    console.error("Error reading from DynamoDB:", error);
    throw error;
  }
}

// when the game is inited, get player and dealer 2 random cards respectively
export interface Card {
  rank: string;
  suit: string;
}

const ranks = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];
const suits = ["♠", "♥", "♦", "♣"];
const initialDeck = ranks
  .map((rank) => suits.map((suit) => ({ rank, suit })))
  .flat();
console.log(initialDeck);

const gameState: {
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  message: string;
  winer: "player" | "dealer" | "draw" | "";
  score: number;
} = {
  playerHand: [],
  dealerHand: [],
  deck: initialDeck,
  message: "",
  winer: "player",
  score: 0,
};

function getRandomCards(deck: Card[], count: number) {
  const randomIndexSet = new Set<number>();
  while (randomIndexSet.size < count) {
    randomIndexSet.add(Math.floor(Math.random() * deck.length));
  }
  const randomCards = deck.filter((_, index) => randomIndexSet.has(index));
  const remainingDeck = deck.filter((_, index) => !randomIndexSet.has(index));
  return [randomCards, remainingDeck];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  if (!address) {
    return new Response(JSON.stringify({ message: " address is required" }), {
      status: 400,
    });
  }

  const [playerCards, remainingDeck] = getRandomCards(gameState.deck, 2);
  const [dealerCards, newDeck] = getRandomCards(remainingDeck, 2);
  gameState.playerHand = playerCards;
  gameState.dealerHand = dealerCards;
  gameState.deck = newDeck;
  gameState.message = "";
  gameState.winer = "";

  // get the score of the player
  try {
    const data = await readScore(address);
    gameState.score = data || 0;
  } catch (error) {
    console.error("Error reading from DynamoDB:", error);
    return new Response(
      JSON.stringify({
        message: "Error reading from DynamoDB",
      }),
      { status: 500 }
    );
  }

  return Response.json({
    playerHand: gameState.playerHand,
    dealerHand: [gameState.dealerHand[0], { rank: "?", suit: "?" } as Card],
    message: gameState.message,
    score: gameState.score,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  if (action === "auth") {
    const { address, message, signature } = body;
    const isValid = await verifyMessage({
      address,
      message,
      signature,
    });

    if (!isValid) {
      return new Response(JSON.stringify({ message: "Invalid signature" }), {
        status: 400,
      });
    }

    // jwt token for authentication
    const jwtToken = jwt.sign({ address }, process.env.JWT_SECRET || "", {
      expiresIn: "1h",
    });

    return new Response(
      JSON.stringify({
        message: "Authentication successful",
        jwtToken: jwtToken,
      }),
      {
        status: 200,
      }
    );
  }

  // auth with jwt token
  const jwtToken = request.headers.get("Authorization")?.split(" ")[1];
  if (!jwtToken) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || "");
  console.log("decoded", decoded);
  if (!decoded || typeof decoded !== "object" || !("address" in decoded)) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }
  if (decoded.address.toLowerCase() !== body.address.toLowerCase()) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  // when hit is clicked, get a random card from the deck and add it to the player's hand
  // calculate the total value of the player's hand
  // if the value is 21: player wins, black jack
  // if the value is more 21: player loses, bust
  // if the value is less than 21: player can hit or stand
  if (action === "hit") {
    const [cards, remainingDeck] = getRandomCards(gameState.deck, 1);
    gameState.playerHand.push(...cards);
    gameState.deck = remainingDeck;

    // 计算玩家的牌
    const playerValue = calculateHandValue(gameState.playerHand);
    if (playerValue === 21) {
      gameState.message = "Player wins, black jack";
      gameState.winer = "player";
      gameState.score = addPlayerScore(gameState.score);
    } else if (playerValue > 21) {
      gameState.message = "Player loses, bust";
      gameState.winer = "dealer";
      gameState.score = reducePlayerScore(gameState.score);
    }
  }
  // when stand is clicked, the dealer will draw cards until the total value of the dealer's hand is greater than or equal to 17
  // calculate the total value of the dealer's hand
  // if the value is 21: dealer wins, black jack
  // if the value is more 21: dealer loses, bust
  // if the value is less than 21: dealer can hit or stand
  else if (action === "stand") {
    while (calculateHandValue(gameState.dealerHand) < 17) {
      const [cards, remainingDeck] = getRandomCards(gameState.deck, 1);
      gameState.dealerHand.push(...cards);
      gameState.deck = remainingDeck;
    }
    // 计算庄家的牌
    const dealerValue = calculateHandValue(gameState.dealerHand);
    if (dealerValue === 21) {
      gameState.message = "Dealer wins, black jack";
      gameState.winer = "dealer";
      gameState.score = reducePlayerScore(gameState.score);
    } else if (dealerValue > 21) {
      gameState.message = "Dealer loses, bust";
      gameState.winer = "player";
      gameState.score = addPlayerScore(gameState.score);
    } else {
      // 计算玩家的牌
      const playerValue = calculateHandValue(gameState.playerHand);
      // calculate player hand value
      // player > dealer: player wins
      // player < dealer: player loses
      // player = dealer: draw
      if (playerValue > dealerValue) {
        gameState.message = "Player wins";
        gameState.winer = "player";
        gameState.score = addPlayerScore(gameState.score);
      } else if (playerValue < dealerValue) {
        gameState.message = "Dealer wins";
        gameState.winer = "dealer";
        gameState.score = reducePlayerScore(gameState.score);
      } else {
        gameState.message = "Draw";
        gameState.winer = "draw";
      }
    }
  } else {
    return new Response(
      JSON.stringify({
        message: "Invalid action",
      }),
      { status: 400 }
    );
  }

  // write the score to DynamoDB
  const { address } = body;
  try {
    await writeScore(address, gameState.score);
  } catch (error) {
    console.error("Error writing to DynamoDB:", error);
    return new Response(
      JSON.stringify({
        message: "Error writing to DynamoDB",
      }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({
      playerHand: gameState.playerHand,
      dealerHand:
        gameState.message !== ""
          ? gameState.dealerHand
          : [gameState.dealerHand[0], { rank: "?", suit: "?" } as Card],
      message: gameState.message,
      score: gameState.score,
    }),
    { status: 200 }
  );
}

// 计算手牌的值
function calculateHandValue(hand: Card[]) {
  let value = 0;
  let aceCount = 0; // 用于判断A是否已计算

  for (const card of hand) {
    if (card.rank === "A") {
      value += 11;
      aceCount++;
    } else if (card.rank === "J" || card.rank === "Q" || card.rank === "K") {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }

  while (value > 21 && aceCount > 0) {
    value -= 10;
    aceCount--;
  }

  return value;
}

function addPlayerScore(currentScore: number): number {
  return currentScore + 100;
}

function reducePlayerScore(currentScore: number): number {
  return currentScore - 100;
}
