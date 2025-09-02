if (!secrets.apiKey) {
  throw Error("api key should be provided!");
}

const playerAddress = args[0];

const apiResponse = await Functions.makeHttpRequest({
  url: `https://dufk5fjc4nqd2vtpu6rmireule0lminz.lambda-url.ap-northeast-2.on.aws/?player_address=${playerAddress}`,
  method: "GET",
  headers: {
    "x-api-key": secrets.apiKey,
  },
});

if (apiResponse.error) {
  console.error(apiResponse.error);
  throw Error("Request failed");
}

const { data } = apiResponse;
if (!data.score) {
  console.error("score does not exist");
  throw Error("score does not exist");
}

console.log("API response data:", JSON.stringify(data, null, 2));

return Functions.encodeInt256(data.score);
