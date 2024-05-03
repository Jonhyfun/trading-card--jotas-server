import * as CardsObject from '../cards'
import { ConnectedSocket } from "../initializers/webSocket";
import { DeckCard } from '../cards/types';
import { deleteRoom, getRooms, setRooms } from '..';
import { handlePointsSum } from '../utils/game/points';
import { handleVisualEffects } from '../utils/game/visual';
import { initialUserData } from '../utils/mock';
import { deepCopy } from '../utils/object';

const onReveal = (attackingPlayer: ConnectedSocket, defendingPlayer: ConnectedSocket) => {
  const firstPendingEffect = attackingPlayer.pendingEffects.shift();
  if (firstPendingEffect) firstPendingEffect();

  const secondPendingEffect = defendingPlayer.pendingEffects.shift();
  if (secondPendingEffect) secondPendingEffect();

  //? Clonando as cartas pra não travar efeitos que modificarem a stack no primeiro effect
  const attackingCard = CardsObject[attackingPlayer.cardStack.slice(-1)[0].cardKey].default
  const defenseCard = CardsObject[defendingPlayer.cardStack.slice(-1)[0].cardKey].default

  if ((attackingCard.priority ?? 0) > (defenseCard.priority ?? 0)) {
    attackingCard.effect(attackingPlayer, defendingPlayer);
    defenseCard.effect(defendingPlayer, attackingPlayer);
  }
  else {
    defenseCard.effect(defendingPlayer, attackingPlayer);
    attackingCard.effect(attackingPlayer, defendingPlayer);
  }

  const attackingPlayerStack = attackingPlayer.cardStack.map(({ cardKey }) => CardsObject[cardKey].default)
  const defendingPlayerStack = defendingPlayer.cardStack.map(({ cardKey }) => CardsObject[cardKey].default)

  attackingPlayer.points.push(handlePointsSum(attackingPlayer, attackingPlayerStack));
  defendingPlayer.points.push(handlePointsSum(defendingPlayer, defendingPlayerStack));

  const currentAttackingGlobal = attackingPlayer.globalEffects.shift();
  const currentDefendingGlobal = defendingPlayer.globalEffects.shift();

  [attackingPlayer, defendingPlayer].forEach((player) => {
    const nextCard = player.ingameDeck.splice(0, 1)?.[0]

    if (!(currentAttackingGlobal === 'sendRepeatedTurn' || currentDefendingGlobal === 'sendRepeatedTurn')) {
      player.stance = player.stance === 'attack' ? 'defense' : 'attack'
    }

    if (nextCard) {
      player.hand.push(nextCard)
    }

    player.send(`setStance/${player.stance}`)
    player.send(`loadHand/${JSON.stringify(player.hand)}`)
    player.send(`loadMyStack/${JSON.stringify(player.cardStack)}`) //TODO juntar todos esses 6 sends?
    player.send(`loadMyPoints/${(player.points.slice(-1)[0] ?? 0).toFixed(2)}`) //TODO nao era pra ter esse Nullable 0

  })

  handleVisualEffects(attackingPlayer, attackingPlayerStack)
  handleVisualEffects(defendingPlayer, defendingPlayerStack)

  attackingPlayer.send(`loadOtherStack/${JSON.stringify(defendingPlayer.cardStack)}`) //TODO dry?
  defendingPlayer.send(`loadOtherStack/${JSON.stringify(attackingPlayer.cardStack)}`)

  attackingPlayer.send(`loadVisualEffects/${JSON.stringify(attackingPlayer.cardVisualEffects)}`)
  defendingPlayer.send(`loadVisualEffects/${JSON.stringify(defendingPlayer.cardVisualEffects)}`)

  attackingPlayer.send(`loadOtherVisualEffects/${JSON.stringify(defendingPlayer.cardVisualEffects)}`)
  defendingPlayer.send(`loadOtherVisualEffects/${JSON.stringify(attackingPlayer.cardVisualEffects)}`)

  attackingPlayer.send(`loadOtherPoints/${(defendingPlayer.points.slice(-1)[0] ?? 0).toFixed(2)}`)
  defendingPlayer.send(`loadOtherPoints/${(attackingPlayer.points.slice(-1)[0] ?? 0).toFixed(2)}`)

  if (attackingPlayer.hand.length === 0 || defendingPlayer.hand.length === 0) {
    const attackWins = (attackingPlayer.points.slice(-1)?.[0] ?? 0) > (defendingPlayer.points.slice(-1)?.[0] ?? 0);
    const defenseWins = (defendingPlayer.points.slice(-1)?.[0] ?? 0) > (attackingPlayer.points.slice(-1)?.[0] ?? 0);

    attackingPlayer.send(`${attackWins ? 'endWining' : 'endLosing'}/${attackWins ? 'Você venceu!' : 'Você perdeu...'}`)
    defendingPlayer.send(`${defenseWins ? 'endWining' : 'endLosing'}/${defenseWins ? 'Você venceu!' : 'Você perdeu...'}`);

    [attackingPlayer, defendingPlayer].forEach((player) => {
      Object.entries(deepCopy(initialUserData)).forEach(([key, value]) => {
        player[key] = value;
      })
      player.room = null
    })

    deleteRoom(attackingPlayer.room!)
  }
}

export const onUserSetCard = (player: ConnectedSocket, card: DeckCard) => {
  if (!player.currentSetCard) {
    player.currentSetCard = card

    const roomPlayers = getRooms()[player.room!]
    const otherPlayer = roomPlayers.find(({ ip }) => ip !== player.ip)

    if (!otherPlayer) return player.send('error/Sala vazia!')

    if (roomPlayers.every((player) => player.currentSetCard)) {
      const focusedStack = player.stance === 'attack' ? otherPlayer.cardStack : player.cardStack
      const otherStack = player.stance === 'defense' ? otherPlayer.cardStack : player.cardStack

      focusedStack.push(player.currentSetCard)
      otherStack.push(otherPlayer.currentSetCard!)

      player.currentSetCard = undefined
      otherPlayer.currentSetCard = undefined

      if (player.stance === 'attack') return onReveal(player, otherPlayer)
      return onReveal(otherPlayer, player)
    }
  }
}