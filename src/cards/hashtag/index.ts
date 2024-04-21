import { UserData } from "../../initializers/webSocket"
import { CardData } from "../types"

const cardData: CardData = {
  label: '#',
  value: -3,
  limit: 1,
  effect: (castingPlayer: UserData, otherPlayer: UserData) => { }
}

export default cardData