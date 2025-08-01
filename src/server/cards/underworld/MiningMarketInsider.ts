import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Tag} from '../../../common/cards/Tag';
import {IProjectCard} from '../IProjectCard';
import {CardType} from '../../../common/cards/CardType';
import {ActionCard} from '../ActionCard';
import {all, digit} from '../Options';
import {IPlayer} from '../../IPlayer';
import {CardResource} from '../../../common/CardResource';

export class MiningMarketInsider extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MINING_MARKET_INSIDER,
      cost: 5,
      tags: [Tag.EARTH],
      resourceType: CardResource.DATA,

      action: {
        spend: {resourcesHere: 4},
        drawCard: 1,
      },

      metadata: {
        cardNumber: 'U046',
        renderData: CardRenderer.builder((b) => {
          b.effect('After any player identifies 1 or more underground spaces (at once), add 1 data resource to this card.',
            (ab) => ab.identify(1, {all}).startEffect.resource(CardResource.DATA)).br;
          b.action('Spend 4 data resources on this card to draw a card.',
            (ab) => ab.resource(CardResource.DATA, {amount: 4, digit}).startAction.cards(1));
        }),
      },
    });
  }

  // Behavior is similar in Demetron labs
  // This doesn't need to be serialized. It ensures this is only evaluated once per action.
  // When the server restarts, the player has to take an action anyway.
  private lastAction = -1;
  public onIdentificationByAnyPlayer(cardOwner: IPlayer) {
    const actionCount = cardOwner.game.getActionCount();
    if (this.lastAction !== actionCount) {
      cardOwner.addResourceTo(this);
      this.lastAction = actionCount;
    }
  }
}

