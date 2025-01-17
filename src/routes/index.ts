import { Cards } from "../cards/types";
import { Route } from "./types";
import * as cards from "../cards";
import { getRooms } from "..";
import { PrismaQuery } from "../providers/prisma";

export const example: Route = (app) => {
  app.post("/example", (req, res) => {
    return res.send("user posted");
  });
};

export const rooms: Route = (app) => {
  app.get("/rooms", (req, res) => {
    return res.send(
      Object.entries(getRooms()).map(([key, players]) => ({
        room: key,
        playerCount: players.length,
      }))
    );
  });
};

export const cardImage: Route = (app) => {
  app.get("/cardImage/:cardName", (req, res) => {
    return res.sendFile(
      `/${req.params.cardName.split(".")[0]}/${
        req.params.cardName.split(".")[0]
      }.png`,
      { root: "src/cards" },
      (err) => res.status(404).send(err)
    );
  });
};

export const visualEffects: Route = (app) => {
  app.get("/visualEffects/:effectName", (req, res) => {
    return res.sendFile(
      `/${req.params.effectName.split(".")[0]}/${
        req.params.effectName.split(".")[0]
      }.png`,
      { root: "src/visualEffects" },
      (err) => res.status(404).send(err)
    );
  });
};

export const getCards: Route = (app) => {
  app.get("/cards", (req, res) => {
    const result = Object.entries(cards).map(
      ([cardKey, { default: cardData }]) => {
        const { effect, ...cardProps } = cardData;
        return {
          key: cardKey,
          src: `/cardImage/${cardKey}.png`,
          ...cardProps,
        };
      }
    );
    return res.send(result);
  });
};

export const setDeck: Route = (app) => {
  app.post("/userCards", (req, res) => {
    const cards = req.body.cards as Cards[];
    //TODO pegar o uid
    const uid = "";
    PrismaQuery(async (prisma) => {
      const deck = await prisma.deck.create({
        data: {
          userFirebaseId: uid,
          cards: {
            createMany: {
              data: [
                {
                  id: "carta-mucho-loka", //TODO
                },
              ],
            },
          },
        },
      });
    });
    return res.send("OK");
  });
};
